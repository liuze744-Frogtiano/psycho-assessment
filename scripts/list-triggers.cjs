const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
});

(async () => {
  const res = await client.ListTriggers({
    FunctionName: 'psycho-assessment',
    Limit: 20
  });
  for (const t of (res.Triggers || [])) {
    console.log('=== Trigger ===');
    console.log('Name:', t.TriggerName);
    console.log('Type:', t.Type);
    console.log('Enable:', t.Enable);
    console.log('Desc:', t.TriggerDesc);
    console.log('AvailableStatus:', t.AvailableStatus);
    console.log('');
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
