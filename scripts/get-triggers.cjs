const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    const triggers = await client.ListTriggers({
      FunctionName: 'psycho-assessment',
    });
    console.log('Triggers:', JSON.stringify(triggers, null, 2));

    // 也获取函数全部信息
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('\nFunction keys:', Object.keys(fn));
    console.log('Full AccessInfo:', JSON.stringify(fn.AccessInfo, null, 2));
    if (fn.Triggers) {
      console.log('Function Triggers:', JSON.stringify(fn.Triggers, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
