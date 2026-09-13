const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
});

const FN = 'psycho-assessment';

(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    await client.DeleteTrigger({ FunctionName: FN, TriggerName: 'ljnjxiy386', Type: 'http' });
    console.log('Deleted old trigger ljnjxiy386');
    await sleep(3000);
  } catch (e) {
    console.log('delete warn:', e.message);
  }
  const triggerDesc = JSON.stringify({
    AuthType: 'NONE',
    NetConfig: { EnableIntranet: false, EnableExtranet: true },
    CorsConfig: {
      Enable: true,
      Origins: ['*'],
      Headers: ['content-type', 'x-admin-key'],
      Methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      ExposeHeaders: ['*'],
      MaxAge: 3600,
      Credentials: false
    }
  });
  const res = await client.CreateTrigger({
    FunctionName: FN,
    TriggerName: 'corspub' + Math.random().toString(36).slice(2, 5),
    Type: 'http',
    TriggerDesc: triggerDesc,
    Enable: 'OPEN'
  });
  const info = res.TriggerInfo;
  console.log('TriggerName:', info.TriggerName);
  const desc = JSON.parse(info.TriggerDesc);
  console.log('Public URL:', desc.NetConfig.ExtranetUrl);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
