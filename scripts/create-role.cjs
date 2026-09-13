const tencentcloud = require('tencentcloud-sdk-nodejs');
const CamClient = tencentcloud.cam.v20190116.Client;

const client = new CamClient({
  credential: require('./_credentials.cjs').tencent(),
  region: '',
  profile: {},
});

const trustPolicy = JSON.stringify({
  version: '2.0',
  statement: [
    {
      action: 'name/sts:AssumeRole',
      effect: 'allow',
      principal: { service: ['scf.cloud.tencent.com'] },
    },
  ],
});

(async () => {
  try {
    // 创建 SCF 执行角色
    const role = await client.CreateRole({
      RoleName: 'SCF_ExecuteRole',
      PolicyDocument: trustPolicy,
      Description: 'SCF execution role',
    });
    console.log('Role created:', role.RoleName || 'OK');

    // 附加全访问策略（简化，后续可收紧）
    await client.AttachRolePolicy({
      AttachRoleId: 0,
      RoleName: 'SCF_ExecuteRole',
      PolicyId: 1, // AdministratorAccess
    });
    console.log('Policy attached');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    // 如果角色已存在，也继续
    if (err.message.includes('already exist') || err.message.includes('已存在')) {
      console.log('Role already exists, continuing...');
      process.exit(0);
    }
    process.exit(1);
  }
})();
