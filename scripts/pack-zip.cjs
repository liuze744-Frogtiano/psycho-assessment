const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const projectRoot = 'c:\\Users\\Administrator\\Desktop\\psychological assessment';
const outPath = path.join(process.env.TEMP, 'psycho-scf.zip');

const output = fs.createWriteStream(outPath);
const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Packed: ${archive.pointer()} bytes`);
  process.exit(0);
});

archive.on('error', (err) => {
  console.error('Archive error:', err);
  process.exit(1);
});

archive.pipe(output);

// 要排除的目录和文件
const excludeDirs = ['.git', 'data', 'scripts'];
const excludeFiles = ['.env', '.env.example', 'test-tos.cjs', '.vefaasignore', '_verify_v2.cjs', 'package-lock.json', 'serverless.yml'];

function walkDir(dir, base) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) continue;
      walkDir(fullPath, base);
    } else {
      if (excludeFiles.includes(entry.name)) continue;
      // 读取文件
      const fileBuffer = fs.readFileSync(fullPath);
      // 设置权限：scf_bootstrap 和 run.sh 设为 755，其他 644
      const isExec = entry.name === 'scf_bootstrap' || entry.name === 'run.sh';
      archive.append(fileBuffer, {
        name: relPath,
        mode: isExec ? 0o755 : 0o644,
      });
    }
  }
}

walkDir(projectRoot, projectRoot);
archive.finalize();
