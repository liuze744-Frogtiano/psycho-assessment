const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    const list = await client.ListFunctions({ Limit: 1 });
    console.log('SCF ListFunctions OK, total:', list.TotalCount);
    process.exit(0);
  } catch (err) {
    console.error('SCF Error:', err.message);
    process.exit(1);
  }
})();
