const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('Status:', fn.Status);
    console.log('StatusDesc:', fn.StatusDesc);
    console.log('Namespace:', fn.Namespace);
    console.log('Timeout:', fn.Timeout);
    console.log('Runtime:', fn.Runtime);
    console.log('Type:', fn.Type);

    const trig = await client.ListTriggers({ FunctionName: 'psycho-assessment' });
    console.log('\n--- Triggers ---');
    trig.Triggers.forEach(t => {
      console.log('Name:', t.TriggerName);
      console.log('Type:', t.Type);
      console.log('AvailableStatus:', t.AvailableStatus);
      console.log('CustomArgument:', (t.CustomArgument || '').slice(0, 500));
      console.log('---');
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
