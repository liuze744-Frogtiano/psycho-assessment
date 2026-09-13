const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

const cos = new COS({
  ...require('./_credentials.cjs').tencentCOS(),
});

const APPID = '1486566271';
const REGION = 'ap-shanghai';
const BUCKET = `psycho-web-${APPID}`;

(async () => {
  try {
    // 1. 检查 bucket 是否存在，不存在则创建
    console.log('检查 bucket:', BUCKET);
    try {
      await cos.headBucket({ Bucket: BUCKET, Region: REGION });
      console.log('Bucket 已存在');
    } catch (e) {
      if (e.statusCode === 404) {
        console.log('创建 bucket...');
        await cos.putBucket({ Bucket: BUCKET, Region: REGION });
        console.log('Bucket 创建成功');
      } else {
        throw e;
      }
    }

    // 2. 设置 bucket 为公有读私有写
    console.log('设置 bucket 权限为公有读...');
    await cos.putBucketAcl({
      Bucket: BUCKET,
      Region: REGION,
      ACL: 'public-read',
    });

    // 3. 开启静态网站托管
    console.log('开启静态网站托管...');
    await cos.putBucketWebsite({
      Bucket: BUCKET,
      Region: REGION,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'index.html' },
      },
    });

    // 4. 上传 public 目录所有文件
    const publicDir = path.join(__dirname, '..', 'public');
    const files = [];
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(full);
      }
    }
    walk(publicDir);

    console.log(`上传 ${files.length} 个文件...`);
    for (const file of files) {
      const key = path.relative(publicDir, file).replace(/\\/g, '/');
      const ext = path.extname(file).toLowerCase();
      const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      }[ext] || 'application/octet-stream';

      await cos.putObject({
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Body: fs.createReadStream(file),
        ContentType: contentType,
        // 关键：设置 Content-Disposition: inline，让浏览器渲染而非下载
        Headers: {
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-cache',
        },
      });
      console.log('  上传:', key);
    }

    // 5. 获取静态网站 URL
    const websiteUrl = `https://${BUCKET}.cos-website.${REGION}.myqcloud.com`;
    console.log('\n=== 部署完成 ===');
    console.log('静态网站 URL:', websiteUrl);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
