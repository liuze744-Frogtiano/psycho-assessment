/**
 * 运维脚本统一凭据入口
 *
 * 安全约定：
 * 1. scripts/ 下任何脚本都不得硬编码 SecretId / SecretKey / AccessKey；
 * 2. 运行脚本前在 shell 中设置环境变量（参考根目录 .env.example），例如：
 *      PowerShell> $env:TENCENT_SECRET_ID="..."; node scripts/check-scf.cjs
 * 3. 本模块被各脚本引用，缺少变量时立即退出并给出明确提示。
 */
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(
      `[credentials] 缺少环境变量 ${name}。请先设置后再运行本脚本（参考 .env.example）。`
    );
    process.exit(1);
  }
  return v;
}

module.exports = {
  /** 腾讯云 SCF SDK 凭据（小写键名） */
  tencent() {
    return {
      secretId: requireEnv('TENCENT_SECRET_ID'),
      secretKey: requireEnv('TENCENT_SECRET_KEY')
    };
  },
  /** 腾讯云 COS SDK 凭据（大写键名） */
  tencentCOS() {
    return {
      SecretId: requireEnv('TENCENT_SECRET_ID'),
      SecretKey: requireEnv('TENCENT_SECRET_KEY')
    };
  },
  /** 校验火山引擎 TOS 凭据（给 SCF 注入环境变量的脚本使用） */
  assertTos() {
    requireEnv('TOS_ACCESS_KEY');
    requireEnv('TOS_SECRET_KEY');
  }
};
