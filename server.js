/**
 * 网页心理测评系统 · Node.js 服务端
 * - 静态页面：知情同意 / 问卷 / 受试者结果 / 管理员后台
 * - API：题库下发、作答提交（JSON 落盘）、结果查询、管理统计
 * - 数据存储：data/responses.json（原子写入，防止并发写坏文件）
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

// 优先 IPv4 解析：部分 serverless 容器无 IPv6 出口，Node 18 默认 IPv6 优先会导致
// 访问外部对象存储（TOS）连接超时
require('dns').setDefaultResultOrder('ipv4first');

const {
  LIKERT_OPTIONS,
  DIMENSIONS,
  B5_KEYS,
  AI_SUB_KEYS,
  AI_TOTAL_KEY,
  SCORED_DIM_KEYS,
  SCHEMA_VERSION,
  QUESTIONS,
  computeScores,
  isValidAnswers,
  publicQuestions,
  round2
} = require('./lib/questions');
const stats = require('./lib/stats');
// 数据存储：本地文件 或 TOS 对象存储（通过 TOS_* 环境变量切换）
const { readResponses, writeResponses, tosEnabled, LOCAL_FILE } = require('./lib/storage');

const app = express();
const PORT = process.env._FAAS_RUNTIME_PORT || process.env.PORT || process.env.SCF_PORT || 9000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((err, req, res, next) => {
  if (err) {
    console.error('[body-parser error]', err.message);
    return res.status(400).json({ error: '请求数据格式错误，请检查输入。' });
  }
  next();
});
// SCF HTTP 触发器会强制添加 Content-Disposition: attachment，导致浏览器下载而非渲染页面
// 通过重写 res.end 在最终发送前强制覆盖为 inline
app.use((req, res, next) => {
  const originalEnd = res.end;
  res.end = function (...args) {
    if (!res.headersSent) {
      res.setHeader('Content-Disposition', 'inline');
    }
    return originalEnd.apply(this, args);
  };
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- 数据读写已迁移至 lib/storage.js ---------------- */

/** 仅保留与当前题库题数一致的记录，防止旧版量表数据混入统计造成 NaN */
function filterCurrentRecords(list) {
  const current = list.filter((r) => Array.isArray(r.answers) && r.answers.length === QUESTIONS.length);
  const skipped = list.length - current.length;
  if (skipped > 0) {
    console.warn(`[data] 已跳过 ${skipped} 条题数不匹配的旧版记录（当前题库 ${QUESTIONS.length} 题）`);
  }
  return current;
}

/* ---------------- API ---------------- */

// 题库下发（含李克特选项）
app.get('/api/questions', (req, res) => {
  res.json({
    likert: LIKERT_OPTIONS,
    dimensions: DIMENSIONS,
    questions: publicQuestions()
  });
});

// 提交作答：校验 -> 计分 -> 落盘
app.post('/api/responses', async (req, res) => {
  const { answers } = req.body || {};
  if (!isValidAnswers(answers)) {
    return res.status(400).json({ error: `作答数据无效：请确保 ${QUESTIONS.length} 道题均已作答，且选项为 1-5 的整数。` });
  }
  try {
    const scores = computeScores(answers);
    const record = {
      version: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      answers,
      scores
    };
    const list = await readResponses();
    list.push(record);
    await writeResponses(list);
    res.json({ id: record.id, timestamp: record.timestamp, scores });
  } catch (err) {
    console.error('[api] 保存作答失败：', err);
    res.status(500).json({ error: '服务器保存数据失败，请稍后重试。' });
  }
});

// 查询单份结果（结果页使用）
app.get('/api/results/:id', async (req, res) => {
  const list = await readResponses();
  const record = list.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '未找到该测评结果。' });
  res.json({
    id: record.id,
    timestamp: record.timestamp,
    answers: record.answers,
    scores: record.scores
  });
});

// 管理统计（需口令）
app.get('/api/admin/stats', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '访问口令错误。' });
  }
  const list = filterCurrentRecords(await readResponses());
  res.json(buildAdminStats(list));
});

// 管理：用户原始记录列表（需口令）
// 返回每名受试者的完整记录（ID、提交时间、40 题原始作答、9 个量表得分），
// 同时附带题目元信息，供后台“查看详情”展开全部题目原始作答。
app.get('/api/admin/records', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '访问口令错误。' });
  }
  const list = filterCurrentRecords(await readResponses());
  const dimNameOf = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.name]));
  const records = list
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)) // 最新提交在前
    .map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      answers: r.answers,
      dimensions: r.scores.dimensions
    }));
  res.json({
    total: records.length,
    questions: QUESTIONS.map((q) => ({
      id: q.id,
      text: q.text,
      dimension: q.dimension,
      dimensionName: dimNameOf[q.dimension],
      reverse: q.reverse
    })),
    likert: LIKERT_OPTIONS,
    records
  });
});

// 管理诊断：检查存储层连通性（需口令），用于快速定位数据保存失败的原因
app.get('/api/admin/diag-storage', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '访问口令错误。' });
  }
  const started = Date.now();
  try {
    const list = await readResponses();
    res.json({ ok: true, tosEnabled, records: list.length, costMs: Date.now() - started });
  } catch (err) {
    res.json({
      ok: false,
      tosEnabled,
      error: {
        name: err && err.name,
        code: err && err.code,
        statusCode: err && err.statusCode,
        message: err && err.message,
        syscall: err && err.syscall,
        hostname: err && err.hostname
      },
      costMs: Date.now() - started
    });
  }
});

// 管理：删除单条用户记录（需口令）
// 直接对全部记录操作（含旧版记录），管理员可清理任意无效数据；
// 写盘走原子替换，避免并发写坏文件。
app.delete('/api/admin/records/:id', async (req, res) => {
  if (req.get('x-admin-key') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '访问口令错误。' });
  }
  try {
    const list = await readResponses();
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: '未找到该记录，可能已被删除。' });
    }
    list.splice(idx, 1);
    await writeResponses(list);
    res.json({ ok: true });
  } catch (err) {
    console.error('[api] 删除记录失败：', err);
    res.status(500).json({ error: '服务器删除数据失败，请稍后重试。' });
  }
});

/* ---------------- 统计计算 ---------------- */

function distributionBins(values) {
  // 0.5 分一档，共 9 档：1.0–1.5, 1.5–2.0, ..., 4.5–5.0
  const bins = Array.from({ length: 9 }, (_, i) => ({
    label: `${(1 + i * 0.5).toFixed(1)}–${(1.5 + i * 0.5).toFixed(1)}`,
    count: 0
  }));
  for (const v of values) {
    if (!isFinite(v)) continue;
    let bi = Math.floor((v - 1) / 0.5);
    bi = Math.min(bins.length - 1, Math.max(0, bi));
    bins[bi].count += 1;
  }
  return bins;
}

function buildAdminStats(responses) {
  const n = responses.length;
  // 参与均分/分布的分数：大五 5 + AI 子维度 3 + AI 总态度 1
  const scoreDims = [...SCORED_DIM_KEYS, AI_TOTAL_KEY];
  const dimMeta = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

  if (n === 0) {
    return {
      generatedAt: new Date().toISOString(),
      totalParticipants: 0,
      dimensions: [],
      itemStats: [],
      cronbachAlpha: {},
      correlations: { rows: [], columns: [] }
    };
  }

  // 每名被试的维度得分矩阵
  const dimScores = {};
  scoreDims.forEach((k) => (dimScores[k] = []));
  responses.forEach((r) => {
    scoreDims.forEach((k) => dimScores[k].push(r.scores.dimensions[k]));
  });

  // 各维度平均分与分布
  const dimensions = scoreDims.map((k) => {
    const vals = dimScores[k];
    return {
      key: k,
      name: dimMeta[k].name,
      mean: round2(stats.mean(vals)),
      sd: round2(Math.sqrt(stats.variance(vals))),
      min: Math.min(...vals),
      max: Math.max(...vals),
      distribution: distributionBins(vals)
    };
  });

  // 单题作答分布
  const itemStats = QUESTIONS.map((q, i) => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    responses.forEach((r) => {
      counts[r.answers[i]] += 1;
    });
    return {
      id: q.id,
      text: q.text,
      dimension: q.dimension,
      dimensionName: dimMeta[q.dimension].name,
      reverse: q.reverse,
      counts,
      mean: round2(stats.mean(responses.map((r) => r.answers[i])))
    };
  });

  // Cronbach's α：8 个挂题维度（各 5 题）+ 大五总量表（25 题）+ AI 总量表（15 题）
  // 注意：α 必须基于转换后的题目分（反向题先做 6 - 原始分），否则反向题与正向题
  // 的相关为负，会得出错误的负 α。
  const itemsOf = (pred) =>
    QUESTIONS.map((q, i) => (pred(q) ? i : -1)).filter((i) => i >= 0);
  const itemScoreOf = (r, i) => (QUESTIONS[i].reverse ? 6 - r.answers[i] : r.answers[i]);

  const cronbachAlpha = {};
  for (const k of SCORED_DIM_KEYS) {
    const idxs = itemsOf((q) => q.dimension === k);
    cronbachAlpha[k] = round3(stats.cronbachAlpha(responses.map((r) => idxs.map((i) => itemScoreOf(r, i)))));
  }
  const b5Idx = itemsOf((q) => B5_KEYS.includes(q.dimension));
  cronbachAlpha.bigfive_total = round3(
    stats.cronbachAlpha(responses.map((r) => b5Idx.map((i) => itemScoreOf(r, i))))
  );
  const aiIdx = itemsOf((q) => AI_SUB_KEYS.includes(q.dimension));
  cronbachAlpha.ai_total = round3(
    stats.cronbachAlpha(responses.map((r) => aiIdx.map((i) => itemScoreOf(r, i))))
  );

  // 相关矩阵：大五 5 维度（行）× AI 3 子维度 + AI 总态度（列）
  const corrColumns = [...AI_SUB_KEYS, AI_TOTAL_KEY];
  const correlations = {
    columns: corrColumns.map((k) => ({ key: k, name: dimMeta[k].name })),
    rows: B5_KEYS.map((bk) => ({
      key: bk,
      name: dimMeta[bk].name,
      cells: corrColumns.map((ak) => {
        const r = stats.pearson(dimScores[bk], dimScores[ak]);
        const p = stats.pValueFromR(r, n);
        return { key: ak, r: round3(r), p: roundP(p) };
      })
    })),
    n
  };

  return {
    generatedAt: new Date().toISOString(),
    totalParticipants: n,
    dimensions,
    itemStats,
    cronbachAlpha,
    correlations
  };

  function round3(x) {
    return isFinite(x) ? Math.round(x * 1000) / 1000 : null;
  }
  function roundP(p) {
    if (!isFinite(p)) return null;
    return p < 0.001 ? '<0.001' : Math.round(p * 1000) / 1000;
  }
}

/* ---------------- 页面路由（简洁 URL） ---------------- */

const PAGES = {
  '/': 'index.html',
  '/survey': 'survey.html',
  '/result': 'result.html',
  '/admin': 'admin.html'
};
for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
}

/* ---------------- 启动 ---------------- */

async function ensureDataFile() {
  // TOS 模式下数据存在对象存储，无需初始化本地文件
  if (tosEnabled) return;
  await fsp.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  try {
    await fsp.access(LOCAL_FILE);
  } catch {
    await fsp.writeFile(LOCAL_FILE, '[]', 'utf8');
  }
}

ensureDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`心理测评系统已启动： http://localhost:${PORT}`);
      console.log(`管理员后台：     http://localhost:${PORT}/admin（默认口令 ${ADMIN_PASSWORD}，可通过环境变量 ADMIN_PASSWORD 修改）`);
    });
  })
  .catch((err) => {
    console.error('初始化数据文件失败：', err);
    process.exit(1);
  });
