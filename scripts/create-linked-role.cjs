const tencentcloud = require('tencentcloud-sdk-nodejs');
const CamClient = tencentcloud.cam.v20190116.Client;

const client = new CamClient({
  credential: require('./_credentials.cjs').tencent(),
  region: '',
  profile: {},
});

(async () => {
  try {
    // 创建 SCF 服务关联角色
    const res = await client.CreateServiceLinkedRole({
      QCSServiceName: ['scf.cloud.tencent.com'],
      Description: 'SCF service linked role',
    });
    console.log('Service linked role created:', JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
