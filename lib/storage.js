/**
 * 数据存储抽象层
 * - 本地模式（默认）：读写 data/responses.json，原子写入
 * - TOS 模式（配置 TOS_* 环境变量时启用）：数据存火山引擎对象存储 TOS，
 *   veFaaS 等无状态环境下容器重启数据不丢失；内存缓存减少 TOS 往返
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
let memoryCache = null; // TOS 模式下的内存缓存，避免每次读都拉 TOS

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
async function readFromTos() {
  if (memoryCache !== null) return memoryCache;
  try {
    const res = await tosClient.getObject({ bucket: tosBucket, key: tosKey });
    const raw = await res.content.toString('utf8');
    const list = JSON.parse(raw);
    memoryCache = Array.isArray(list) ? list : [];
    return memoryCache;
  } catch (err) {
    // 404 = TOS 上还没有文件，返回空数组
    if (err && err.statusCode === 404) {
      memoryCache = [];
      return memoryCache;
    }
    console.error('[storage] TOS 读取失败：', err.message);
    throw err;
  }
}

async function writeToTos(list) {
  memoryCache = list; // 先更新内存缓存，保证读己之写
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
