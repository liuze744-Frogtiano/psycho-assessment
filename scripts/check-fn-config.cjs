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
    console.log('Handler:', fn.Handler);
    console.log('Runtime:', fn.Runtime);
    console.log('Type:', fn.Type);
    console.log('InstallDependency:', fn.InstallDependency);
    console.log('CodeSize:', fn.CodeSize);
    console.log('CodeResult:', fn.CodeResult);
    console.log('CodeError:', fn.CodeError);
    console.log('Port:', fn.Port);
    console.log('ProtocolType:', fn.ProtocolType);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
