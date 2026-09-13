const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    // 更新触发器 CORS 配置，允许 github.io 和所有来源
    const res = await client.UpdateTrigger({
      FunctionName: 'psycho-assessment',
      TriggerName: '58usi2l3bw',
      Type: 'http',
      TriggerDesc: JSON.stringify({
        AuthType: 'NONE',
        EnableSimpleMode: false,
        NetConfig: {
          EnableIntranet: false,
          EnableExtranet: true,
        },
        CorsConfig: {
          Enable: true,
          Origins: ['*'],
          Headers: ['content-type', 'x-admin-key'],
          Methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
          ExposeHeaders: ['*'],
          MaxAge: 3600,
          Credentials: false,
        },
      }),
    });
    console.log('Trigger CORS updated');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
