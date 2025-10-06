const { version } = require('../../package.json');

module.exports = class extends think.Controller {
  indexAction() {
    this.type = 'html';
    this.body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>waline-tscf</title>
    </head>
    <body>
      <div id="waline" style="max-width: 800px;margin: 0 auto;"></div>
      <link href='//cdn.jsdelivr.net/npm/@waline-tscf/client/dist/waline.css' rel='stylesheet' />
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

    think.logger.debug('【首页】评论系统示例页面渲染完成');
  }
};

think.logger.debug(' 已加载/controller/index.js');
