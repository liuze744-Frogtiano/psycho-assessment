const fs = require('fs');
const path = require('path');
const https = require('https');

const USER = 'liuze744-Frogtiano';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('缺少环境变量 GITHUB_TOKEN，请先设置后再运行（参考 .env.example）。'); process.exit(1); }
const REPO = 'psycho-assessment';
const API = 'api.github.com';

function ghRequest(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: API,
        path: pathname,
        method,
        headers: {
          Authorization: `token ${TOKEN}`,
          'User-Agent': 'node-script',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// 递归读取 public 目录
function collectFiles(dir, base = '') {
  const result = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      result.push(...collectFiles(full, rel));
    } else {
      result.push({ rel, full });
    }
  }
  return result;
}

(async () => {
  try {
    // 1. 创建仓库
    console.log(`创建仓库 ${REPO}...`);
    let r = await ghRequest('POST', `/user/repos`, {
      name: REPO,
      description: '心理测评系统前端',
      private: false,
      auto_init: false,
    });
    if (r.status === 201) {
      console.log('仓库创建成功');
    } else if (r.status === 422) {
      console.log('仓库已存在，跳过创建');
    } else {
      console.error('创建仓库失败:', r.status, JSON.stringify(r.body).slice(0, 200));
      process.exit(1);
    }

    // 2. 上传所有文件到 main 分支
    const files = collectFiles(path.join(__dirname, '..', 'public'));
    console.log(`上传 ${files.length} 个文件...`);

    for (const f of files) {
      const content = fs.readFileSync(f.full).toString('base64');
      r = await ghRequest('PUT', `/repos/${USER}/${REPO}/contents/${f.rel}`, {
        message: `deploy: ${f.rel}`,
        content,
        branch: 'main',
      });
      if (r.status === 200 || r.status === 201) {
        console.log(`  ${f.rel}  OK`);
      } else {
        // 文件已存在，需要先获取 sha 再更新
        const get = await ghRequest('GET', `/repos/${USER}/${REPO}/contents/${f.rel}?ref=main`);
        if (get.status === 200 && get.body.sha) {
          r = await ghRequest('PUT', `/repos/${USER}/${REPO}/contents/${f.rel}`, {
            message: `update: ${f.rel}`,
            content,
            sha: get.body.sha,
            branch: 'main',
          });
          console.log(`  ${f.rel}  updated`);
        } else {
          console.error(`  ${f.rel}  FAILED:`, r.status);
        }
      }
    }

    // 3. 启用 GitHub Pages（从 main 分支根目录）
    console.log('启用 GitHub Pages...');
    r = await ghRequest('POST', `/repos/${USER}/${REPO}/pages`, {
      source: { branch: 'main', path: '/' },
    });
    console.log('Pages 状态:', r.status, JSON.stringify(r.body).slice(0, 200));

    console.log('\n=== 部署完成 ===');
    console.log('仓库地址:', `https://github.com/${USER}/${REPO}`);
    console.log('GitHub Pages 地址:', `https://${USER}.github.io/${REPO}/`);
    console.log('（Pages 可能需要 1-2 分钟生效）');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
