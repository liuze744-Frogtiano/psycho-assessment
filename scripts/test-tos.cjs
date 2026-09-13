// 测试 TOS 连接和读写
// ⚠️ 安全约定：本脚本只允许读写「测试 key」，绝不能指向线上数据 key（responses.json），
//    否则会把线上已收集的真实数据清空（历史上发生过一次）。
// 密钥从环境变量读取，切勿在此硬编码（参考 .env.example）
// PowerShell 示例：$env:TOS_ACCESS_KEY="..."; $env:TOS_SECRET_KEY="..."; node scripts/test-tos.cjs
if (!process.env.TOS_ACCESS_KEY || !process.env.TOS_SECRET_KEY) {
  console.error('缺少 TOS_ACCESS_KEY / TOS_SECRET_KEY 环境变量，请先设置（参考 .env.example）。');
  process.exit(1);
}
process.env.TOS_ENDPOINT = process.env.TOS_ENDPOINT || 'tos-cn-shanghai.volces.com';
process.env.TOS_REGION = process.env.TOS_REGION || 'cn-shanghai';
process.env.TOS_BUCKET = process.env.TOS_BUCKET || 'psycho-data';
process.env.TOS_KEY = 'responses-test.json'; // 测试专用 key，与线上数据完全隔离

const { readResponses, writeResponses, tosEnabled } = require('../lib/storage');

(async () => {
  console.log('TOS enabled:', tosEnabled);
  console.log('--- 读取（应返回空数组）---');
  const list = await readResponses();
  console.log('读取结果:', list.length, '条');

  console.log('--- 写入测试数据 ---');
  const testRecord = {
    id: 'test-' + Date.now(),
    timestamp: new Date().toISOString(),
    answers: [1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1,2,3,4,5],
    scores: { dimensions: { test: 3.0 } }
  };
  await writeResponses([testRecord]);
  console.log('写入成功');

  console.log('--- 再次读取（应返回1条）---');
  const list2 = await readResponses();
  console.log('读取结果:', list2.length, '条，id=', list2[0]?.id);

  console.log('--- 清空测试数据 ---');
  await writeResponses([]);
  console.log('已清空');
  process.exit(0);
})().catch((e) => {
  console.error('测试失败:', e.message);
  process.exit(1);
});
