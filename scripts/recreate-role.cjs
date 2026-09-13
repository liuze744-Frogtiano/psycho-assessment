const tencentcloud = require('tencentcloud-sdk-nodejs');
const CamClient = tencentcloud.cam.v20190116.Client;

const client = new CamClient({
  credential: require('./_credentials.cjs').tencent(),
  region: '',
  profile: {},
});

(async () => {
  try {
    // 删除旧角色
    try {
      await client.DeleteRole({ RoleName: 'SCF_ExecuteRole' });
      console.log('Old role deleted');
    } catch (e) {
      console.log('Delete old role:', e.message);
    }

    // 用正确的信任策略重新创建
    const trustPolicy = JSON.stringify({
      version: '2.0',
      statement: [
        {
          action: 'name/sts:AssumeRole',
          effect: 'allow',
          principal: { service: ['scf.qcloud.com'] },
        },
      ],
    });

    await client.CreateRole({
      RoleName: 'SCF_ExecuteRole',
      PolicyDocument: trustPolicy,
      Description: 'SCF execution role',
    });
    console.log('Role recreated with scf.qcloud.com trust policy');

    // 获取角色 ID 并附加策略
    const roles = await client.DescribeRoleList({ Page: 1, Rp: 200 });
    const scfRole = roles.List.find((r) => r.RoleName === 'SCF_ExecuteRole');
    await client.AttachRolePolicy({
      AttachRoleId: scfRole.RoleId,
      PolicyName: 'AdministratorAccess',
    });
    console.log('AdministratorAccess policy attached');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
