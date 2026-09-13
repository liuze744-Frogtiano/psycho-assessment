const tencentcloud = require('tencentcloud-sdk-nodejs');
const ScfClient = tencentcloud.scf.v20180416.Client;

const client = new ScfClient({
  credential: require('./_credentials.cjs').tencent(),
  region: 'ap-shanghai',
  profile: {},
});

(async () => {
  try {
    // 1. 删除旧的公网触发器 6hvauwk9di
    console.log('删除旧触发器 6hvauwk9di...');
    await client.DeleteTrigger({
      FunctionName: 'psycho-assessment',
      TriggerName: '6hvauwk9di',
      Type: 'http',
    });
    console.log('已删除');

    // 2. 删除内网触发器 hp5ldsz732
    console.log('删除内网触发器 hp5ldsz732...');
    try {
      await client.DeleteTrigger({
        FunctionName: 'psycho-assessment',
        TriggerName: 'hp5ldsz732',
        Type: 'http',
      });
      console.log('已删除');
    } catch (e) {
      console.log('内网触发器删除失败（可能已不存在）:', e.message);
    }

    // 3. 创建新的 HTTP 触发器，启用 simple mode
    console.log('创建新触发器（simple mode）...');
    const res = await client.CreateTrigger({
      FunctionName: 'psycho-assessment',
      TriggerName: 'http-trigger',
      Type: 'http',
      TriggerDesc: JSON.stringify({
        url: '/',
        method: 'ANY',
        netConfig: {
          enableIntranet: false,
          enableExtranet: true,
        },
        authType: 'NONE',
        enableSimpleMode: true,
      }),
    });
    console.log('触发器创建结果:', JSON.stringify(res, null, 2));

    // 4. 等待生效并获取新 URL
    await new Promise((r) => setTimeout(r, 5000));
    const trig = await client.ListTriggers({ FunctionName: 'psycho-assessment' });
    trig.Triggers.forEach((t) => {
      const desc = JSON.parse(t.TriggerDesc);
      console.log('\n触发器:', t.TriggerName);
      console.log('公网 URL:', desc.NetConfig?.ExtranetUrl || '无');
      console.log('SimpleMode:', desc.EnableSimpleMode);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
