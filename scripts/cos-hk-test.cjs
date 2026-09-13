const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  ...require('./_credentials.cjs').tencentCOS(),});

const APPID = '1486566271';
const REGION = 'ap-hongkong';
const BUCKET = 'psycho-web-hk-' + APPID;

(async () => {
  try {
    await cos.putBucket({ Bucket: BUCKET, Region: REGION });
    console.log('HK Bucket created');
  } catch (e) {
    console.log('putBucket:', e.statusCode, e.message || '');
  }

  await cos.putObject({
    Bucket: BUCKET, Region: REGION, Key: 'index.html',
    Body: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>HK测试</title></head><body><h1>HK 渲染测试</h1></body></html>',
    ContentType: 'text/html; charset=utf-8'
  });

  await cos.putBucketWebsite({
    Bucket: BUCKET, Region: REGION,
    WebsiteConfiguration: {
      IndexDocument: { Suffix: 'index.html' },
      ErrorDocument: { Key: 'index.html' }
    }
  });

  await cos.putObjectAcl({ Bucket: BUCKET, Region: REGION, Key: 'index.html', ACL: 'public-read' });

  console.log('\n--- Endpoints ---');
  console.log('Default:  https://' + BUCKET + '.cos.' + REGION + '.myqcloud.com/index.html');
  console.log('Website:  http://' + BUCKET + '.cos-website.' + REGION + '.myqcloud.com/');
})().catch(e => { console.error('ERR:', e.statusCode || '', e.message || e); process.exit(1); });
