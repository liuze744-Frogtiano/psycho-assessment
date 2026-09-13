const tencentcloud = require('tencentcloud-sdk-nodejs');
const CamClient = tencentcloud.cam.v20190116.Client;

const client = new CamClient({
  credential: require('./_credentials.cjs').tencent(),
  region: '',
  profile: {},
});

(async () => {
  try {
    const role = await client.GetRole({ RoleName: 'SCF_ExecuteRole' });
    console.log('Full response:', JSON.stringify(role, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
