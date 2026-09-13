const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  ...require('./_credentials.cjs').tencentCOS(),});

const APPID = '1486566271';
const REGION = 'ap-shanghai';
const BUCKET = 'psycho-web-' + APPID;

(async () => {
  // 1. 创建存储桶
  try {
    await cos.putBucket({ Bucket: BUCKET, Region: REGION });
    console.log('Bucket created');
  } catch (e) {
    console.log('putBucket:', e.statusCode, e.message || '');
  }

  // 2. 上传测试 HTML
  await cos.putObject({
    Bucket: BUCKET,
    Region: REGION,
    Key: 'index.html',
    Body: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>COS测试</title></head><body><h1>COS 静态网站渲染测试</h1></body></html>',
    ContentType: 'text/html; charset=utf-8'
  });
  console.log('index.html uploaded');

  // 3. 配置静态网站托管
  await cos.putBucketWebsite({
    Bucket: BUCKET,
    Region: REGION,
    WebsiteConfiguration: {
      IndexDocument: { Suffix: 'index.html' },
      ErrorDocument: { Key: 'index.html' }
    }
  });
  console.log('Static website enabled');

  // 4. 设置对象为公有读（通过存储桶权限或单独设置）
  await cos.putObjectAcl({
    Bucket: BUCKET,
    Region: REGION,
    Key: 'index.html',
    ACL: 'public-read'
  });
  console.log('ACL public-read set');

  console.log('\n--- Endpoints ---');
  console.log('Default:  https://' + BUCKET + '.cos.' + REGION + '.myqcloud.com/index.html');
  console.log('Website:  http://' + BUCKET + '.cos-website.' + REGION + '.myqcloud.com/');
})().catch(e => { console.error('ERR:', e.statusCode || '', e.message || e); process.exit(1); });
