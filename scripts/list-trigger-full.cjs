const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    const trig = await client.ListTriggers({ FunctionName: 'psycho-assessment' });
    trig.Triggers.forEach((t, i) => {
      console.log(`--- Trigger ${i + 1} ---`);
      console.log(JSON.stringify(t, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
