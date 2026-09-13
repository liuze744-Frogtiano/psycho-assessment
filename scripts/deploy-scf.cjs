require('./_credentials.cjs').assertTos();
const fs = require('fs');
const path = require('path');
const tencentcloud = require('tencentcloud-sdk-nodejs');

const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

const zipBuf = fs.readFileSync(path.join(process.env.TEMP, 'psycho-scf.zip'));
const zipBase64 = zipBuf.toString('base64');

const params = {
  FunctionName: 'psycho-assessment',
  Type: 'HTTP',
  Runtime: 'Nodejs18.15',
  Handler: 'server.handler',
  Timeout: 60,
  MemorySize: 1024,
  Role: '4611686018449046296',
  Code: { ZipFile: zipBase64 },
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
};

(async () => {
  console.log('Creating SCF Web function...');
  try {
    const data = await client.CreateFunction(params);
    console.log('CreateFunction OK:', data.RequestId);

    // 等待函数创建完成
    console.log('Waiting for function to be active...');
    let retries = 0;
    while (retries < 30) {
      await new Promise((r) => setTimeout(r, 3000));
      const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
      console.log(`Status: ${fn.Status}, Retry: ${retries + 1}`);
      if (fn.Status === 'Active') break;
      retries++;
    }

    // 获取访问地址
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('\n=== Deploy Result ===');
    console.log('FunctionName:', fn.FunctionName);
    console.log('Runtime:', fn.Runtime);
    console.log('Status:', fn.Status);
    if (fn.AccessInfo) {
      console.log('Public URL:', fn.AccessInfo.InternalAccessUrl || fn.AccessInfo.PublicNetAccessUrl || fn.AccessInfo.AccessUrl);
      console.log('Full AccessInfo:', JSON.stringify(fn.AccessInfo, null, 2));
    } else {
      console.log('No AccessInfo found. Full function keys:', Object.keys(fn));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
