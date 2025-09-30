// 声明变量
let nunjucks, helper, crypto;

// 加载器函数
const load = {
  nunjucks: () => nunjucks || (nunjucks = require("nunjucks")),
  helper: () => helper || (helper = require("think-helper")),
  crypto: () => crypto || (crypto = require("crypto")),
};

// 从环境变量获取自定义Gravatar模板
const { GRAVATAR_STR } = process.env;

// 创建nunjucks模板环境
const env = new (load.nunjucks().Environment)();

// 添加md5哈希过滤器
env.addFilter("md5", (str) => load.helper().md5(str));
// 添加sha256哈希过滤器
env.addFilter("sha256", (str) =>
  load.crypto().createHash("sha256").update(str).digest("hex")
);

// 默认的头像生成规则：
// 1. 如果昵称是纯数字，使用QQ头像
// 2. 如果邮箱是QQ邮箱，使用QQ头像
// 3. 其他情况使用Libravatar服务
const DEFAULT_GRAVATAR_STR = `{%- set numExp = r/^[0-9]+$/g -%}
{%- set qqMailExp = r/^[0-9]+@qq.com$/ig -%}
{%- if numExp.test(nick) -%}
  https://q1.qlogo.cn/g?b=qq&nk={{nick}}&s=100
{%- elif qqMailExp.test(mail) -%}
  https://q1.qlogo.cn/g?b=qq&nk={{mail|replace('@qq.com', '')}}&s=100
{%- else -%}
  https://seccdn.libravatar.org/avatar/{{mail|md5}}
{%- endif -%}`;

// 导出头像服务类
module.exports = class extends think.Service {
  // 生成头像URL的方法
  async stringify(comment) {
    // think.logger.debug('【头像】开始生成头像URL');

    // 获取自定义头像生成函数
    const fn = think.config("avatarUrl");

    // 如果配置了自定义函数，优先使用
    if (think.isFunction(fn)) {
      // think.logger.debug('【头像】使用自定义头像生成函数');
      const ret = await fn(comment);

      if (think.isString(ret) && ret) {
        // think.logger.debug('【头像】自定义头像URL生成成功');
        return ret;
      }
    }

    // 使用配置的或默认的头像生成规则
    const gravatarStr = GRAVATAR_STR || DEFAULT_GRAVATAR_STR;

    // think.logger.debug('【头像】使用模板生成头像URL');
    return env.renderString(gravatarStr, comment);
  }
};

think.logger.debug(" 已加载/service/avatar.js");
