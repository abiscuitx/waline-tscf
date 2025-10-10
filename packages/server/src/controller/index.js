const { version } = require('../../package.json');

module.exports = class extends think.Controller {
  indexAction() {
    // 读取环境变量 INDEX_HTML（优先级最高）
    const INDEX_HTML = process.env.INDEX_HTML;

    // 判断是否显示示例页面
    let shouldShowExample = false;

    if (INDEX_HTML === 'show') {
      // 环境变量明确要求显示
      shouldShowExample = true;
      think.logger.debug('【首页】环境变量 INDEX_HTML=show，强制显示示例页面');
    } else if (INDEX_HTML === 'false') {
      // 环境变量明确要求隐藏
      shouldShowExample = false;
      think.logger.debug('【首页】环境变量 INDEX_HTML=false，强制显示 404');
    } else {
      // 未设置 INDEX_HTML，根据运行环境判断
      shouldShowExample = think.env === 'development';
      think.logger.debug(
        `【首页】未设置 INDEX_HTML，根据运行环境 (${think.env}) ${shouldShowExample ? '显示示例页面' : '显示 404'}`,
      );
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
    } else {
      // 显示 404 页面
      this.status = 404;
      think.logger.debug('【首页】显示 404 页面');
    }
  }
};

think.logger.debug(' 已加载/controller/index.js');
