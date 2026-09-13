require('./_credentials.cjs').assertTos();
const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    await client.UpdateFunctionConfiguration({
      FunctionName: 'psycho-assessment',
      Environment: {
        Variables: [
          { Key: 'ADMIN_PASSWORD', Value: 'admin123' },
          { Key: 'NODE_ENV', Value: 'production' },
          { Key: 'TOS_ACCESS_KEY', Value: process.env.TOS_ACCESS_KEY },
          { Key: 'TOS_SECRET_KEY', Value: process.env.TOS_SECRET_KEY },
          { Key: 'TOS_ENDPOINT', Value: 'tos-cn-shanghai.volces.com' },
          { Key: 'TOS_REGION', Value: 'cn-shanghai' },
          { Key: 'TOS_BUCKET', Value: 'psycho-data' },
          { Key: 'TOS_KEY', Value: 'responses.json' },
        ],
      },
    });
    console.log('Environment variables updated');

    // 等待生效
    await new Promise((r) => setTimeout(r, 3000));
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('Status:', fn.Status);
    console.log('Env count:', fn.Environment?.Variables?.length || 0);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
