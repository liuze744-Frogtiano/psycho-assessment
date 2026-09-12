/* 管理员后台：口令验证、统计渲染（均分/分布/单题分布/α/相关性） */
(function () {
  'use strict';

  const KEY_STORE = 'psa_admin_key';
  const DIM_ORDER = [
    'extraversion', 'agreeableness', 'conscientiousness',
    'neuroticism', 'openness',
    'ai_benefit', 'ai_risk', 'ai_usage', 'ai_attitude'
  ];
  const DIM_NAMES = {
    extraversion: '外倾性',
    agreeableness: '宜人性',
    conscientiousness: '尽责性',
    neuroticism: '神经质',
    openness: '开放性',
    ai_benefit: 'AI收益感知',
    ai_risk: 'AI风险感知',
    ai_usage: 'AI使用意愿',
    ai_attitude: 'AI总态度',
    bigfive_total: '大五总量表（25题）',
    ai_total: 'AI态度总量表（15题）'
  };

  let dimMeanChart = null;
  let distChart = null;

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function starOf(p) {
    if (p === null || !isFinite(p)) return '';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  }

  async function fetchStats(key) {
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-key': key } });
    if (res.status === 401) throw new Error('unauthorized');
    if (!res.ok) throw new Error('server');
    return res.json();
  }

  async function fetchRecords(key) {
    const res = await fetch('/api/admin/records', { headers: { 'x-admin-key': key } });
    if (res.status === 401) throw new Error('unauthorized');
    if (!res.ok) throw new Error('server');
    return res.json();
  }

  /* ---------- 门禁 ---------- */
  async function tryLogin(key) {
    await fetchStats(key); // 仅用于校验口令
    sessionStorage.setItem(KEY_STORE, key);
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    await loadDashboard();
  }

  document.getElementById('gate-btn').addEventListener('click', async () => {
    const input = document.getElementById('gate-input');
    const errEl = document.getElementById('gate-error');
    if (!input.value.trim()) {
      errEl.textContent = '请输入访问口令。';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      await tryLogin(input.value.trim());
    } catch (e) {
      errEl.textContent = e.message === 'unauthorized' ? '口令错误，请重试。' : '服务器请求失败，请稍后重试。';
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('gate-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('gate-btn').click();
  });

  /* ---------- 仪表盘 ---------- */
  async function loadDashboard() {
    const key = sessionStorage.getItem(KEY_STORE);
    let stats, records;
    try {
      [stats, records] = await Promise.all([fetchStats(key), fetchRecords(key)]);
    } catch (e) {
      if (e.message === 'unauthorized') {
        sessionStorage.removeItem(KEY_STORE);
        window.location.reload();
        return;
      }
      alert('统计数据加载失败，请点击“刷新数据”重试。');
      return;
    }
    render(stats);
    renderRecords(records);
  }

  document.getElementById('refresh-btn').addEventListener('click', loadDashboard);

  function render(s) {
    document.getElementById('meta').textContent =
      '统计生成时间 ' + new Date(s.generatedAt).toLocaleString('zh-CN', { hour12: false });

    document.getElementById('total-n').textContent = s.totalParticipants;

    if (s.totalParticipants === 0) {
      document.getElementById('alpha-list').innerHTML =
        '<p class="col-span-3 text-sm text-gray-400">暂无数据：尚未有被试完成测评。</p>';
      document.getElementById('dim-table').innerHTML = '<p class="text-sm text-gray-400">暂无数据</p>';
      document.getElementById('item-table').innerHTML =
        '<tr><td colspan="8" class="py-6 text-center text-sm text-gray-400">暂无数据</td></tr>';
      document.getElementById('corr-table').innerHTML =
        '<tr><td colspan="5" class="py-6 text-center text-sm text-gray-400">暂无数据</td></tr>';
      return;
    }

    renderAlpha(s.cronbachAlpha);
    renderDimMeans(s.dimensions);
    renderDistSelect(s.dimensions);
    renderDistChart(s.dimensions);
    renderItems(s.itemStats);
    renderCorr(s.correlations);
  }

  function renderAlpha(alpha) {
    // 8 个挂题维度（各 5 题）+ 两个总量表
    const keys = [...DIM_ORDER.filter((k) => k !== 'ai_attitude'), 'bigfive_total', 'ai_total'];
    const rows = keys
      .filter((k) => alpha[k] !== undefined)
      .map((k) => {
        const val = alpha[k];
        const label = (DIM_NAMES[k] || k) + (k === 'bigfive_total' || k === 'ai_total' ? '' : '（5题）');
        return (
          '<div class="flex items-center justify-between">' +
          '<span class="text-gray-600">' + label + '</span>' +
          '<span class="text-gray-900 tabular-nums">' + (val === null ? '—' : val.toFixed(3)) + '</span>' +
          '</div>'
        );
      });
    document.getElementById('alpha-list').innerHTML = rows.join('');
  }

  function renderDimMeans(dims) {
    const sorted = dims.slice().sort((a, b) => DIM_ORDER.indexOf(a.key) - DIM_ORDER.indexOf(b.key));
    const labels = sorted.map((d) => d.name);
    const means = sorted.map((d) => d.mean);

    if (dimMeanChart) dimMeanChart.destroy();
    dimMeanChart = new Chart(document.getElementById('dim-mean-chart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: means,
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 5, ticks: { stepSize: 1, color: '#9ca3af' }, grid: { color: '#f3f4f6' } },
          y: { ticks: { color: '#374151' }, grid: { display: false } }
        }
      }
    });

    document.getElementById('dim-table').innerHTML =
      '<table class="w-full text-sm">' +
      '<thead><tr class="text-left text-xs text-gray-400 border-b border-gray-100">' +
      '<th class="py-2 font-normal">维度</th><th class="py-2 px-3 font-normal text-right">M</th>' +
      '<th class="py-2 px-3 font-normal text-right">SD</th><th class="py-2 pl-3 font-normal text-right">范围</th>' +
      '</tr></thead><tbody>' +
      sorted.map((d) =>
        '<tr class="border-b border-gray-50">' +
        '<td class="py-2 text-gray-700">' + esc(d.name) + '</td>' +
        '<td class="py-2 px-3 text-right tabular-nums">' + d.mean.toFixed(2) + '</td>' +
        '<td class="py-2 px-3 text-right tabular-nums">' + (d.sd == null ? '—' : d.sd.toFixed(2)) + '</td>' +
        '<td class="py-2 pl-3 text-right tabular-nums text-gray-400">' + d.min.toFixed(2) + ' – ' + d.max.toFixed(2) + '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>';
  }

  function renderDistSelect(dims) {
    const sel = document.getElementById('dist-select');
    const current = sel.value;
    sel.innerHTML = dims
      .slice()
      .sort((a, b) => DIM_ORDER.indexOf(a.key) - DIM_ORDER.indexOf(b.key))
      .map((d) => '<option value="' + d.key + '">' + esc(d.name) + '</option>')
      .join('');
    if (current) sel.value = current;
  }

  function renderDistChart(dims) {
    const sel = document.getElementById('dist-select');
    const key = sel.value;
    const dim = dims.find((d) => d.key === key) || dims[0];

    if (distChart) distChart.destroy();
    distChart = new Chart(document.getElementById('dist-chart'), {
      type: 'bar',
      data: {
        labels: dim.distribution.map((b) => b.label),
        datasets: [{
          label: '人数',
          data: dim.distribution.map((b) => b.count),
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#9ca3af' }, grid: { color: '#f3f4f6' } }
        }
      }
    });
  }

  document.getElementById('dist-select').addEventListener('change', async () => {
    const key = sessionStorage.getItem(KEY_STORE);
    const stats = await fetchStats(key);
    renderDistChart(stats.dimensions);
  });

  function renderItems(itemStats) {
    document.getElementById('item-table').innerHTML = itemStats
      .map((it) => {
        const total = Object.values(it.counts).reduce((a, b) => a + b, 0) || 1;
        const cells = [1, 2, 3, 4, 5]
          .map((v) => '<td class="py-2.5 px-3 tabular-nums text-gray-600">' + it.counts[v] + '</td>')
          .join('');
        const bars = [1, 2, 3, 4, 5]
          .map((v) => {
            const pct = (it.counts[v] / total) * 100;
            const opacity = 0.35 + v * 0.13;
            return '<div class="h-full" style="width:' + pct + '%;background:rgba(17,24,39,' + opacity.toFixed(2) + ')"></div>';
          })
          .join('');
        return (
          '<tr class="border-b border-gray-50">' +
          '<td class="py-2.5 pr-3">' +
          '<span class="text-gray-900 font-medium">' + it.id + '</span>' +
          (it.reverse ? '<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-400">反向</span>' : '') +
          '<span class="block text-xs text-gray-400 mt-0.5">' + esc(it.text) + '</span>' +
          '</td>' + cells +
          '<td class="py-2.5 px-3"><div class="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100">' + bars + '</div></td>' +
          '<td class="py-2.5 px-3 text-right tabular-nums">' + it.mean.toFixed(2) + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function renderCorr(correlations) {
    if (!correlations || !correlations.rows) {
      document.getElementById('corr-table').innerHTML =
        '<tr><td colspan="5" class="py-6 text-center text-sm text-gray-400">暂无数据</td></tr>';
      return;
    }
    document.getElementById('corr-table').innerHTML = correlations.rows
      .map((row) => {
        const cells = row.cells
          .map((c) => {
            const rText = c.r === null ? '—' : c.r.toFixed(3) + starOf(c.p);
            const pText = c.p === null ? '—' : typeof c.p === 'string' ? c.p : c.p.toFixed(3);
            return (
              '<td class="py-2.5 px-3 text-right tabular-nums align-middle">' +
              '<div class="text-gray-800">' + rText + '</div>' +
              '<div class="text-[10px] text-gray-400">p=' + pText + '</div>' +
              '</td>'
            );
          })
          .join('');
        return (
          '<tr class="border-b border-gray-50">' +
          '<td class="py-2.5 pr-3 text-gray-700 whitespace-nowrap">' + esc(row.name) + '</td>' +
          cells +
          '</tr>'
        );
      })
      .join('');
  }

  /* ---------- 用户原始记录列表 ---------- */
  const DIM_COLS = [
    'extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness',
    'ai_benefit', 'ai_risk', 'ai_usage', 'ai_attitude'
  ];
  const RECORD_COLSPAN = 12; // ID + 时间 + 9 个分数列 + 操作

  function fmtRecordTime(iso) {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  }

  function renderRecords(data) {
    const tbody = document.getElementById('records-table');

    if (!data.records.length) {
      tbody.innerHTML =
        '<tr><td colspan="' + RECORD_COLSPAN + '" class="py-6 text-center text-sm text-gray-400">暂无记录：尚未有被试完成测评。</td></tr>';
      return;
    }

    const labelOf = {};
    data.likert.forEach((o) => { labelOf[o.value] = o.label; });

    tbody.innerHTML = data.records
      .map((r) => {
        const scoreCells = DIM_COLS
          .map((k) => '<td class="py-2.5 px-3 text-right tabular-nums text-gray-700">' + r.dimensions[k].toFixed(2) + '</td>')
          .join('');
        return (
          '<tr class="border-b border-gray-50 align-middle">' +
          '<td class="py-2.5 pr-3"><span class="font-mono text-xs text-gray-500" title="' + r.id + '">' + r.id.slice(0, 8) + '…</span></td>' +
          '<td class="py-2.5 px-3 whitespace-nowrap text-gray-600">' + fmtRecordTime(r.timestamp) + '</td>' +
          scoreCells +
          '<td class="py-2.5 pl-3 text-right">' +
          '<div class="flex items-center justify-end gap-2">' +
          '<button type="button" class="js-toggle-detail px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors" data-id="' + r.id + '">查看详情</button>' +
          '<button type="button" class="js-delete-record px-3 py-1 rounded-full border border-red-200 text-xs text-red-500 hover:border-red-400 hover:text-red-600 transition-colors" data-id="' + r.id + '">删除</button>' +
          '</div>' +
          '</td>' +
          '</tr>' +
          '<tr class="hidden detail-row" id="detail-' + r.id + '">' +
          '<td colspan="' + RECORD_COLSPAN + '" class="bg-gray-50 px-4 py-5">' + detailHtml(r, data.questions, labelOf) + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function detailHtml(r, questions, labelOf) {
    const items = questions
      .map((q, i) => {
        const raw = r.answers[i];
        return (
          '<div class="border border-gray-200 rounded-xl bg-white px-4 py-3">' +
          '<div class="flex items-center justify-between gap-3 mb-1">' +
          '<div class="text-xs text-gray-400 whitespace-nowrap">' +
          '<span class="font-medium text-gray-700">' + q.id + '</span>' + ' · ' + esc(q.dimensionName) +
          (q.reverse ? '<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-400">反向</span>' : '') +
          '</div>' +
          '<div class="text-right whitespace-nowrap"><span class="text-base font-medium text-gray-900 tabular-nums">' + raw + '</span>' +
          '<span class="text-xs text-gray-400 ml-1">' + esc(labelOf[raw] || '') + '</span></div>' +
          '</div>' +
          '<p class="text-[13px] leading-relaxed text-gray-600">' + esc(q.text) + '</p>' +
          '</div>'
        );
      })
      .join('');
    return (
      '<div class="mb-3 flex flex-wrap items-center justify-between gap-2">' +
      '<p class="text-xs text-gray-500">记录ID <span class="font-mono text-gray-700">' + r.id + '</span></p>' +
      '<p class="text-xs text-gray-400">下表为该用户 ' + questions.length + ' 道题的<strong class="text-gray-600">原始作答分值</strong>（1=非常不同意 … 5=非常同意）；反向题的维度计分已按 6 − 原始分 转换</p>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' + items + '</div>'
    );
  }

  // 事件委托：展开 / 收起详情
  document.getElementById('records-table').addEventListener('click', (e) => {
    const btn = e.target.closest('.js-toggle-detail');
    if (!btn) return;
    const row = document.getElementById('detail-' + btn.dataset.id);
    if (!row) return;
    const hidden = row.classList.toggle('hidden');
    btn.textContent = hidden ? '查看详情' : '收起详情';
  });

  // 事件委托：删除单条记录（二次确认 + 鉴权 + 刷新统计与列表）
  document.getElementById('records-table').addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-delete-record');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id;
    const ok = window.confirm('确定要删除该用户的原始记录吗？此操作不可撤销，删除后统计数据将同步更新。');
    if (!ok) return;

    const key = sessionStorage.getItem(KEY_STORE);
    btn.disabled = true;
    btn.textContent = '删除中…';
    try {
      const res = await fetch('/api/admin/records/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'x-admin-key': key }
      });
      if (res.status === 401) {
        sessionStorage.removeItem(KEY_STORE);
        window.location.reload();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '删除失败');
      }
      // 删除成功：重新拉取统计与记录，确保面板数字同步
      await loadDashboard();
    } catch (err) {
      alert('删除失败：' + err.message);
      btn.disabled = false;
      btn.textContent = '删除';
    }
  });

  /* 若此前已验证过口令，自动进入 */
  (async function autoLogin() {
    const key = sessionStorage.getItem(KEY_STORE);
    if (!key) return;
    try {
      await tryLogin(key);
    } catch {
      sessionStorage.removeItem(KEY_STORE);
    }
  })();
})();
