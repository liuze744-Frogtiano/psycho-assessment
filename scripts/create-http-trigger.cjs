const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    console.log('创建 HTTP 触发器...');
    const res = await client.CreateTrigger({
      FunctionName: 'psycho-assessment',
      TriggerName: 'http-trigger',
      Type: 'http',
      TriggerDesc: JSON.stringify({
        url: '/',
        method: 'ANY',
        netConfig: {
          enableIntranet: false,
          enableExtranet: true,
        },
        authType: 'NONE',
      }),
    });
    console.log('创建成功');

    await new Promise((r) => setTimeout(r, 5000));
    const trig = await client.ListTriggers({ FunctionName: 'psycho-assessment' });
    trig.Triggers.forEach((t) => {
      const desc = JSON.parse(t.TriggerDesc);
      console.log('\n触发器:', t.TriggerName);
      console.log('公网 URL:', desc.NetConfig?.ExtranetUrl || '无');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
