/**
 * 全局 API 基址配置
 * - 本地开发 或 直接访问 SCF 域名：使用相对路径（同源）
 * - 部署在 EdgeOne Pages 等静态托管：指向腾讯云 SCF 后端绝对地址
 */
(function () {
  var host = location.hostname;
  var isSameOrigin =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.indexOf('.tencentscf.com') !== -1;
  window.API_BASE = isSameOrigin
    ? ''
    : 'https://1486566271-58usi2l3bw.ap-shanghai.tencentscf.com';
})();
