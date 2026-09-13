const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    const logs = await client.GetFunctionLogs({
      FunctionName: 'psycho-assessment',
      Limit: 50,
    });
    if (logs.Data && logs.Data.length > 0) {
      logs.Data.forEach((log, i) => {
        console.log(`--- Log ${i + 1} ---`);
        console.log('Level:', log.Level);
        console.log('Message:', log.Log);
        console.log('');
      });
    } else {
      console.log('No logs found');
    }

    // 也获取函数详情看错误信息
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('\n=== Function Detail ===');
    console.log('Status:', fn.Status);
    console.log('StatusRe:', fn.StatusRe);
    console.log('LastVersion:', fn.LastVersion);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
