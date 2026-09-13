/**
 * 数据存储抽象层
 * - 本地模式（默认）：读写 data/responses.json，原子写入
 * - TOS 模式（配置 TOS_* 环境变量时启用）：数据存火山引擎对象存储 TOS，
 *   veFaaS/SCF 等无状态环境下容器重启数据不丢失
 *
 * 可靠性约定（勿回退）：
 * 1. 每次读取都直连 TOS，不做内存缓存 —— 缓存会导致容器回收后"数据看似消失"，
 *    以及多实例并发提交时互相覆盖丢数据；
 * 2. 每次写入前，自动把现有对象快照到 backups/ 前缀（响应式快照，防止误清空）。
 *
 * 两种模式对上层暴露一致的 readResponses() / writeResponses(list) 接口，
 * server.js 无需关心底层存储位置。
 */
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

// 数据目录可通过环境变量覆盖（Render 等平台挂载持久磁盘时使用）。
// 例如 Render 持久磁盘挂载到 /var/data，则设置 DATA_DIR=/var/data。
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const LOCAL_FILE = path.join(DATA_DIR, 'responses.json');

/* ---------------- TOS 客户端（按需初始化） ---------------- */
let tosClient = null;
let tosBucket = '';
let tosKey = '';
let tosEnabled = false;

function initTos() {
  const ak = process.env.TOS_ACCESS_KEY;
  const sk = process.env.TOS_SECRET_KEY;
  const endpoint = process.env.TOS_ENDPOINT;
  const region = process.env.TOS_REGION;
  const bucket = process.env.TOS_BUCKET;
  const key = process.env.TOS_KEY || 'responses.json';

  if (!ak || !sk || !endpoint || !region || !bucket) {
    return false;
  }
  const { TosClient } = require('@volcengine/tos-sdk');
  tosClient = new TosClient({ accessKeyId: ak, accessKeySecret: sk, endpoint, region });
  tosBucket = bucket;
  tosKey = key;
  tosEnabled = true;
  return true;
}

/* ---------------- 本地文件读写 ---------------- */
async function readLocal() {
  let raw;
  try {
    raw = await fsp.readFile(LOCAL_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('[storage] 本地读取失败：', err.message);
    return [];
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    const backup = `${LOCAL_FILE}.corrupt-${Date.now()}.bak`;
    try {
      await fsp.rename(LOCAL_FILE, backup);
      console.error(`[storage] 本地 JSON 解析失败（已备份至 ${backup}）：`, err.message);
    } catch (e) {
      console.error('[storage] 本地 JSON 解析失败且备份失败：', e.message);
    }
    return [];
  }
}

async function writeLocal(list) {
  const tmp = LOCAL_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fsp.rename(tmp, LOCAL_FILE);
}

/* ---------------- TOS 读写 ---------------- */

/*
 * 从 getObject 响应中取出对象原始内容。
 * ⚠️ tos-sdk 2.9.1 实测：内容在 res.data（Buffer），没有 content/body/text 字段！
 *    旧代码因取错字段导致"读到已存在数据时静默返回空数组"，进而每次提交都用
 *    单条新记录覆盖全部历史数据——这是本项目数据丢失事故的根因，勿回退。
 *    若所有已知字段都取不到，直接抛错（宁可失败也不可静默丢数据）。
 */
async function resToRaw(res) {
  if (res && Buffer.isBuffer(res.data)) {
    return res.data.toString('utf8');
  }
  if (res && res.data && typeof res.data[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const ch of res.data) chunks.push(ch);
    return Buffer.concat(chunks).toString('utf8');
  }
  if (res && res.data && typeof res.data.toString === 'function') {
    return res.data.toString('utf8');
  }
  if (res && res.content && typeof res.content.toString === 'function') {
    return res.content.toString('utf8');
  }
  if (res && res.body) {
    return typeof res.body === 'string' ? res.body : res.body.toString('utf8');
  }
  if (res && typeof res.text === 'function') {
    return res.text();
  }
  const keys = res ? Object.keys(res).join(',') : String(res);
  throw new Error(`无法从 TOS getObject 响应中提取内容（响应字段：${keys}）`);
}

async function readFromTos() {
  try {
    const res = await tosClient.getObject({ bucket: tosBucket, key: tosKey });
    const raw = await resToRaw(res);
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    // 404 = TOS 上还没有文件，返回空数组
    if (err && err.statusCode === 404) {
      return [];
    }
    console.error('[storage] TOS 读取失败：', err.message);
    throw err;
  }
}

async function writeToTos(list) {
  // 覆盖前先把现有对象快照到 backups/ 前缀（防误清空，可随时恢复）；
  // 快照失败只告警，不阻塞主写入
  try {
    const cur = await tosClient.getObject({ bucket: tosBucket, key: tosKey });
    const raw = await resToRaw(cur);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await tosClient.putObject({
      bucket: tosBucket,
      key: `backups/responses-pre-${ts}.json`,
      body: Buffer.from(String(raw), 'utf8'),
      contentType: 'application/json'
    });
  } catch (err) {
    if (!err || err.statusCode !== 404) {
      console.warn('[storage] 写入前快照失败（不影响主数据）：', err && err.message);
    }
  }
  try {
    await tosClient.putObject({
      bucket: tosBucket,
      key: tosKey,
      body: Buffer.from(JSON.stringify(list, null, 2), 'utf8'),
      contentType: 'application/json'
    });
  } catch (err) {
    console.error('[storage] TOS 写入失败：', err.message);
    throw err;
  }
}

/* ---------------- 对外接口 ---------------- */
async function readResponses() {
  return tosEnabled ? readFromTos() : readLocal();
}

async function writeResponses(list) {
  return tosEnabled ? writeToTos(list) : writeLocal(list);
}

const usingTos = initTos();
if (usingTos) {
  console.log(`[storage] TOS 持久化已启用：bucket=${tosBucket}, key=${tosKey}`);
} else {
  console.log('[storage] 使用本地文件存储：' + LOCAL_FILE);
}

module.exports = { readResponses, writeResponses, tosEnabled, LOCAL_FILE };
