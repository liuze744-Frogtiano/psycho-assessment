const tencentcloud = require('tencentcloud-sdk-nodejs');
const CamClient = tencentcloud.cam.v20190116.Client;

const client = new CamClient({
  credential: require('./_credentials.cjs').tencent(),
  region: '',
  profile: {},
});

(async () => {
  try {
    const roles = await client.DescribeRoleList({ Page: 1, Rp: 200 });
    const scfRole = roles.List.find((r) => r.RoleName === 'SCF_ExecuteRole');
    if (!scfRole) {
      console.error('SCF_ExecuteRole not found');
      process.exit(1);
    }
    console.log('Role ID:', scfRole.RoleId);

    await client.AttachRolePolicy({
      AttachRoleId: scfRole.RoleId,
      PolicyName: 'AdministratorAccess',
    });
    console.log('Policy attached successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
