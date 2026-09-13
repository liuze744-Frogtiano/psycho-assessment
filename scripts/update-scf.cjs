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

(async () => {
  try {
    console.log('Updating function code...');
    await client.UpdateFunctionCode({
      FunctionName: 'psycho-assessment',
      ZipFile: zipBase64,
    });
    console.log('Code updated. Waiting for build...');

    // 等待函数状态变为 Active
    let retries = 0;
    while (retries < 40) {
      await new Promise((r) => setTimeout(r, 3000));
      const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
      console.log(`Status: ${fn.Status} (${fn.StatusRe || ''}), retry: ${retries + 1}`);
      if (fn.Status === 'Active') break;
      retries++;
    }

    // 获取访问地址
    const fn = await client.GetFunction({ FunctionName: 'psycho-assessment' });
    console.log('\n=== Deploy Result ===');
    console.log('FunctionName:', fn.FunctionName);
    console.log('Status:', fn.Status);
    console.log('Runtime:', fn.Runtime);
    if (fn.AccessInfo) {
      console.log('AccessInfo:', JSON.stringify(fn.AccessInfo, null, 2));
    } else {
      console.log('No AccessInfo. Keys:', Object.keys(fn));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
