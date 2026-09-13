const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
});

const FN = 'psycho-assessment';
const OLD_TRIGGER = 'j8g6clvxh6';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  // 1. 删除旧公网触发器
  console.log('Deleting old trigger', OLD_TRIGGER);
  try {
    await client.DeleteTrigger({
      FunctionName: FN,
      TriggerName: OLD_TRIGGER,
      Type: 'http'
    });
    console.log('Deleted.');
  } catch (e) {
    console.log('Delete warn:', e.message);
  }
  await sleep(3000);

  // 2. 用最小配置新建公网触发器
  const triggerDesc = JSON.stringify({
    AuthType: 'NONE',
    NetConfig: { EnableIntranet: false, EnableExtranet: true }
  });
  console.log('Creating new trigger...');
  const res = await client.CreateTrigger({
    FunctionName: FN,
    TriggerName: 'psycho' + Math.random().toString(36).slice(2, 8),
    Type: 'http',
    TriggerDesc: triggerDesc,
    Enable: 'OPEN'
  });
  console.log('TriggerInfo:', JSON.stringify(res.TriggerInfo, null, 2));
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
