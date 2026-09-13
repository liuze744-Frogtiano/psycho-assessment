const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
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
    console.log('Trigger created:', JSON.stringify(res, null, 2));

    // 等待触发器生效，然后获取地址
    await new Promise((r) => setTimeout(r, 3000));
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('\nAccessInfo:', JSON.stringify(fn.AccessInfo, null, 2));
    console.log('Triggers:', JSON.stringify(fn.Triggers, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
