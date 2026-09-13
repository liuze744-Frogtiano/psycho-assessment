const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
});

const FN = 'psycho-assessment';

(async () => {
  const triggerDesc = JSON.stringify({
    AuthType: 'NONE',
    NetConfig: { EnableIntranet: false, EnableExtranet: true },
    EnableSimpleMode: true
  });
  const res = await client.CreateTrigger({
    FunctionName: FN,
    TriggerName: 'simple' + Math.random().toString(36).slice(2, 6),
    Type: 'http',
    TriggerDesc: triggerDesc,
    Enable: 'OPEN'
  });
  console.log('Name:', res.TriggerInfo.TriggerName);
  console.log('Desc:', res.TriggerInfo.TriggerDesc);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
