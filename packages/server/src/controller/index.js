const { version } = require('../../package.json');

module.exports = class extends think.Controller {
  indexAction() {
    // 首页路由逻辑
    const INDEX_ACCESS = process.env.INDEX_ACCESS;
    let shouldShowExample = false;

    if (INDEX_ACCESS === 'true') {
      shouldShowExample = true;
    } else if (INDEX_ACCESS === 'false') {
      shouldShowExample = false;
    } else {
      const isDevelopment = think.env === 'development';

      if (isDevelopment) {
        shouldShowExample = true;
      } else {
        shouldShowExample = false;
      }
    }
    this.type = 'html';

    if (shouldShowExample) {
      // 显示 Waline 示例页面
      this.body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>waline-tscf</title>
      <link rel="icon" href="https://pic.abiscuit.top/favicon.png">
    </head>
    <body>
      <div id="waline" style="max-width: 800px;margin: 0 auto;"></div>
      <link href='https://cdn.jsdelivr.net/npm/@waline-tscf/client/dist/waline.css' rel='stylesheet' />
      <script type="module">
        import { init } from 'https://cdn.jsdelivr.net/npm/@waline-tscf/client/dist/waline.js';

        console.log(
          '%c @waline-tscf/server %c v${version} ',
          'color: white; background: #0078E7; padding:5px 0;',
          'padding:4px;border:1px solid #0078E7;'
        );
        const params = new URLSearchParams(location.search.slice(1));
        const waline = init({
          el: '#waline',
          path: params.get('path') || '/',
          lang: params.get('lng') || undefined,
          serverURL: location.protocol + '//' + location.host + location.pathname.replace(/\\/+$/, ''),
          recaptchaV3Key: '${process.env.RECAPTCHA_V3_KEY || ''}',
          turnstileKey: '${process.env.TURNSTILE_KEY || ''}',
        });
      </script>
    </body>
    </html>`;
      think.logger.debug('【index】评论页面渲染完成');
    } else {
      // 显示 404 页面
      this.status = 404;
      think.logger.debug('【index】显示 404 页面');
    }
  }
};

think.logger.debug(' 已加载/controller/index.js');
