// 声明变量
let nunjucks, helper, crypto;

// 加载器函数
const load = {
  nunjucks: () => nunjucks || (nunjucks = require('nunjucks')),
  helper: () => helper || (helper = require('think-helper')),
  crypto: () => crypto || (crypto = require('crypto')),
};

// 从环境变量获取自定义Gravatar模板
const { GRAVATAR_STR } = process.env;

// 创建nunjucks模板环境
const env = new (load.nunjucks().Environment)();

// 添加md5哈希过滤器
env.addFilter('md5', (str) => load.helper().md5(str));

// 添加sha256哈希过滤器
env.addFilter('sha256', (str) =>
  load.crypto().createHash('sha256').update(str).digest('hex'),
);

// QQ头像增强模板：自动为QQ邮箱使用QQ头像，其他使用指定的头像服务
const createEnhancedTemplate = (
  fallbackUrl = 'https://seccdn.libravatar.org/avatar/{{mail|md5}}',
) =>
  `{%- set qqMailExp = r/^[0-9]+@qq.com$/ig -%}
{%- if qqMailExp.test(mail) -%}
  https://q1.qlogo.cn/g?b=qq&nk={{mail|replace('@qq.com', '')}}&s=100
{%- else -%}
  ${fallbackUrl}
{%- endif -%}`;

// 导出头像服务类
module.exports = class extends think.Service {
  // 生成头像URL的方法
  async stringify(comment) {
    think.logger.debug('【头像】开始生成头像URL，邮箱:', comment.mail);

    const customFn = think.config('avatarUrl');

    if (think.isFunction(customFn)) {
      const customUrl = await customFn(comment);

      if (customUrl) {
        think.logger.debug('【头像】使用自定义头像:', customUrl);

        return customUrl;
      }
    }

    const gravatarStr = this.getGravatarTemplate();
    const avatarUrl = env.renderString(gravatarStr, comment);

    think.logger.debug('【头像】生成头像URL:', avatarUrl);

    return avatarUrl;
  }

  // 获取头像模板（统一使用QQ头像增强逻辑）
  getGravatarTemplate() {
    if (!GRAVATAR_STR?.trim()) {
      // 使用默认的 Libravatar 服务
      return createEnhancedTemplate();
    }

    const isSimpleLibravatar =
      /^https?:\/\/[^{]*\/avatar\/\{\{mail\|md5\}\}[^{]*$/.test(
        GRAVATAR_STR.trim(),
      );

    if (isSimpleLibravatar) {
      // 使用环境变量指定的头像服务作为fallback
      return createEnhancedTemplate(GRAVATAR_STR.trim());
    }

    // 环境变量是复杂模板，直接使用
    return GRAVATAR_STR.trim();
  }
};

think.logger.debug(' 已加载/service/avatar.js');
