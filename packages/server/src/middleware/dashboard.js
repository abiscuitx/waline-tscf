// 导出仪表盘中间件函数
module.exports = function () {
  // 返回处理函数
  return (ctx) => {
    think.logger.debug('【仪表盘】开始渲染管理界面');

    // 设置响应类型为HTML
    ctx.type = 'html';

    // 构建管理界面HTML内容
    ctx.body = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>waline-tscf 管理系统</title>
    <link rel="icon" href='${process.env.SITE_LOGO || ''}'>
  </head>
  <body>
    <script>
    // 注入环境配置到全局变量
    window.SITE_URL = ${JSON.stringify(
      process.env.SITE_URL,
    )};          // 站点URL
    window.SITE_NAME = ${JSON.stringify(
      process.env.SITE_NAME,
    )};        // 站点名称
    window.recaptchaV3Key = ${JSON.stringify(
      process.env.RECAPTCHA_V3_KEY,
    )}; // reCAPTCHA v3密钥
    window.turnstileKey = ${JSON.stringify(
      process.env.TURNSTILE_KEY,
    )}; // Turnstile密钥
    window.serverURL = location.protocol + '//' + location.host + '/api/';    // 服务端api serverURL  
    </script>
    <!-- 加载管理界面脚本 -->
    <script src="${
      process.env.WALINE_ADMIN_MODULE_ASSET_URL ||
      '//cdn.jsdelivr.net/npm/@waline-tscf/admin'
    }"></script>
  </body>
</html>`;

    think.logger.debug('【仪表盘】管理界面渲染完成');
  };
};

think.logger.debug(' 已加载/middleware/dashboard.js');
