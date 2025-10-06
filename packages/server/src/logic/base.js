// 引入Node.js内置模块
const path = require('node:path');
const qs = require('node:querystring');

// 引入第三方依赖
const jwt = require('jsonwebtoken');
const helper = require('think-helper');

module.exports = class extends think.Logic {
  // 构造函数：初始化用户模型、资源名称和ID
  constructor(...args) {
    super(...args);
    this.modelInstance = this.getModel('Users');
    this.resource = this.getResource();
    this.id = this.getId();
    think.logger.debug('【base】初始化完成', {
      资源: this.resource,
      ID: this.id,
    });
  }

  // 请求前置处理方法
  async __before() {
    let referrer = this.ctx.req.headers['referer'] || this.ctx.referrer(true);
    let origin = this.ctx.req.headers['origin'];

    think.logger.debug('【base】请求来源信息', {
      referrer: referrer,
      origin: origin,
      host: this.ctx.req.headers['host'],
    });

    // 统一处理 referrer，提取 hostname
    if (referrer) {
      try {
        if (referrer.includes('://')) {
          const parsedReferrer = new URL(referrer);

          referrer = parsedReferrer.hostname;
          think.logger.debug('【base】Referrer解析成功', {
            hostname: referrer,
          });
        }
      } catch (e) {
        think.logger.warn('【base】Referrer解析失败', {
          originalReferrer: referrer,
          error: e.message,
        });
        referrer = '';
      }
    }

    // 统一处理 origin，提取 hostname
    if (origin && origin.length > 0) {
      try {
        // 检查 origin 是否是一个完整的 URL
        if (!origin.includes('://')) {
          think.logger.debug('【base】Origin缺少协议，添加http://', {
            originalOrigin: origin,
          });
          origin = `http://${origin}`;
        }
        const parsedOrigin = new URL(origin);

        origin = parsedOrigin.hostname;
        think.logger.debug('【base】Origin解析成功', { hostname: origin });
      } catch (e) {
        think.logger.warn('【base】Origin解析失败', {
          originalOrigin: origin,
          error: e.message,
        });
        // 解析失败时，将 origin 设为空，后续会使用 host
        origin = '';
      }
    }

    let { secureDomains } = this.config();

    if (secureDomains) {
      secureDomains = think.isArray(secureDomains)
        ? secureDomains
        : [secureDomains];

      const defaultDomains = [
        'localhost',
        '127.0.0.1',
        'github.com',
        'api.twitter.com',
        'www.facebook.com',
        'api.weibo.com',
        'graph.qq.com',
      ];

      secureDomains = [...new Set([...secureDomains, ...defaultDomains])];

      // 从环境变量读取域名匹配模式
      // SECURE_DOMAIN_MODE: 'strict' (严格模式，完全匹配) 或 'loose' (宽松模式，支持子域名)
      // 默认为 'loose'
      const domainMode = process.env.SECURE_DOMAIN_MODE || 'loose';
      const isStrictMode = domainMode === 'strict';

      think.logger.debug('【base】域名安全检查模式', {
        mode: domainMode,
        isStrictMode: isStrictMode,
        description: isStrictMode
          ? '严格模式：域名必须完全匹配'
          : '宽松模式：支持子域名匹配',
      });

      // 转换可能的正则表达式字符串为正则表达式对象
      secureDomains = secureDomains
        .map((domain) => {
          // 如果是正则表达式字符串，创建一个 RegExp 对象
          if (
            typeof domain === 'string' &&
            domain.startsWith('/') &&
            domain.endsWith('/')
          ) {
            try {
              const regex = new RegExp(domain.slice(1, -1)); // 去掉斜杠并创建 RegExp 对象

              think.logger.debug('【base】正则表达式域名转换成功', {
                originalPattern: domain,
                regexPattern: regex.source,
              });

              return regex;
            } catch (e) {
              think.logger.error('【base】正则表达式域名转换失败', {
                pattern: domain,
                error: e.message,
              });

              return null;
            }
          }

          return domain;
        })
        .filter(Boolean); // 过滤掉无效的正则表达式

      // 优先检查 referrer，其次 origin，最后使用 host
      // 此时 referrer 和 origin 已经是纯 hostname 了
      let checking = referrer || origin;
      let checkingType = referrer ? 'referrer' : origin ? 'origin' : 'host';

      // 如果 referrer 和 origin 都不存在或解析失败，使用 host header
      if (!checking) {
        const host = this.ctx.req.headers['host'];

        if (host) {
          // 移除端口号，只保留主机名
          checking = host.split(':')[0];
          checkingType = 'host';
          think.logger.debug('【base】使用host header作为检查值', {
            originalHost: host,
            extractedHostname: checking,
          });
        }
      }

      // 如果没有任何检查值，记录警告但不抛出错误
      if (!checking) {
        think.logger.warn('【base】无法获取请求来源信息', {
          referrer: referrer,
          origin: origin,
          host: this.ctx.req.headers['host'],
          path: this.ctx.path,
        });

        return this.ctx.throw(403); // 严格模式：取消注释这行
      }

      const matchResults = secureDomains.map((domain) => {
        const isRegex = think.isFunction(domain.test);
        let matches = false;

        if (isRegex) {
          // 正则表达式匹配
          matches = domain.test(checking);
        } else {
          // 字符串匹配：根据模式选择匹配方式
          if (isStrictMode) {
            // 严格模式：完全匹配
            matches = checking === domain;
          } else {
            // 宽松模式：支持精确匹配和子域名匹配
            // 1. 精确匹配：checking === domain
            // 2. 子域名匹配：checking 以 ".domain" 结尾
            matches = checking === domain || checking.endsWith('.' + domain);
          }
        }

        // 只在匹配成功时打印详细信息，减少日志输出
        if (matches) {
          think.logger.debug('【base】域名匹配成功', {
            domain: isRegex ? `RegExp(${domain.source})` : domain,
            checking: checking,
            type: isRegex ? 'regex' : 'string',
            mode: isStrictMode ? 'strict' : 'loose',
            matchType: checking === domain ? 'exact' : 'subdomain',
          });
        }

        return matches;
      });

      const isSafe = matchResults.some((match) => match);

      if (!isSafe) {
        think.logger.error('【base】域名安全检查失败 - 403错误', {
          requestPath: this.ctx.path,
          requestMethod: this.ctx.method,
          clientIP: this.ctx.ip,
          checkingValue: checking,
          checkingType: checkingType,
          referrer: referrer,
          origin: origin,
          host: this.ctx.req.headers['host'],
          userAgent: this.ctx.req.headers['user-agent'],
          secureDomains: secureDomains.map((domain) =>
            think.isFunction(domain.test) ? `RegExp(${domain.source})` : domain,
          ),
          allHeaders: this.ctx.req.headers,
        });

        return this.ctx.throw(403);
      }

      think.logger.debug('【base】域名安全检查通过', {
        checkingValue: checking,
        matchedDomains: secureDomains.filter(
          (domain, index) => matchResults[index],
        ),
      });
    }

    // 初始化用户状态
    this.ctx.state.userInfo = {};
    const { authorization } = this.ctx.req.headers;
    const { state } = this.get();

    if (!authorization && !state) {
      return;
    }

    // 获取并验证用户令牌
    const token = state || authorization.replace(/^Bearer /, '');
    let userMail = '';

    try {
      think.logger.debug('【base】用户令牌验证');
      userMail = jwt.verify(token, think.config('jwtKey'));
    } catch (e) {
      think.logger.debug('【base】令牌验证失败：', e);
    }

    if (think.isEmpty(userMail) || !think.isString(userMail)) {
      return;
    }

    // 查询用户详细信息
    think.logger.debug('【base】查询用户信息');
    const user = await this.modelInstance.select(
      { email: userMail },
      {
        field: [
          'id',
          'email',
          'url',
          'display_name',
          'type',
          'github',
          'twitter',
          'facebook',
          'google',
          'weibo',
          'qq',
          'avatar',
          '2fa',
          'label',
        ],
      },
    );

    if (think.isEmpty(user)) {
      return;
    }

    // 处理用户信息和头像
    const userInfo = user[0];

    think.logger.debug('【base】处理用户头像');

    let avatarUrl = userInfo.avatar
      ? userInfo.avatar
      : await think.service('avatar').stringify({
          mail: userInfo.email,
          nick: userInfo.display_name,
          link: userInfo.url,
        });
    const { avatarProxy } = think.config();

    // 处理头像代理
    if (avatarProxy) {
      // 检查是否为 QQ 头像
      const isQQAvatar = /^https?:\/\/q[0-9]\.qlogo\.cn\/g\?b=qq&nk=/i.test(
        avatarUrl,
      );

      // 只对 QQ 头像进行代理和加密
      if (!isQQAvatar) {
        think.logger.debug('【base】非QQ头像，直接使用原始URL:', avatarUrl);
        // 不对非 QQ 头像进行代理处理，直接使用原始 URL
      } else {
        const proxyKey = process.env.AVATAR_PROXY_KEY;

        if (!proxyKey) {
          // 没有配置密钥，使用明文模式
          avatarUrl = avatarProxy + '?url=' + encodeURIComponent(avatarUrl);
        } else {
          // 使用加密模式
          try {
            const crypto = require('node:crypto');

            // 生成12字节随机IV
            const iv = crypto.randomBytes(12);

            // 从密钥派生AES密钥 (SHA-256)
            const keyHash = crypto
              .createHash('sha256')
              .update(proxyKey)
              .digest();

            // AES-256-GCM加密
            const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
            const encrypted = Buffer.concat([
              cipher.update(avatarUrl, 'utf8'),
              cipher.final(),
            ]);
            const tag = cipher.getAuthTag();

            // 组合: IV + 密文 + Tag
            const combined = Buffer.concat([iv, encrypted, tag]);
            const encoded = encodeURIComponent(combined.toString('base64'));

            avatarUrl = avatarProxy + '?e=' + encoded;
          } catch (err) {
            // 加密失败，回退到明文模式
            think.logger.error('【base】头像URL加密失败', err);
            avatarUrl = avatarProxy + '?url=' + encodeURIComponent(avatarUrl);
          }
        }
      }
    }
    userInfo.avatar = avatarUrl;
    userInfo.mailMd5 = helper.md5(userInfo.email);
    this.ctx.state.userInfo = userInfo;
    this.ctx.state.token = token;
  }

  // 从文件名获取资源名称
  getResource() {
    think.logger.debug('【base】获取资源名称');
    const filename = this.__filename || __filename;
    const last = filename.lastIndexOf(path.sep);

    return filename.substr(last + 1, filename.length - last - 4);
  }

  // 从请求中获取资源ID
  getId() {
    const id = this.get('id');

    if (id && (think.isString(id) || think.isNumber(id))) {
      return id;
    }

    const last = decodeURIComponent(this.ctx.path.split('/').pop());

    if (last !== this.resource && /^([a-z0-9]+,?)*$/i.test(last)) {
      return last;
    }

    return '';
  }

  // 验证码检查方法
  async useCaptchaCheck() {
    const { RECAPTCHA_V3_SECRET, TURNSTILE_SECRET } = process.env;
    const { turnstile, recaptchaV3 } = this.post();

    // 优先使用 Turnstile 验证
    if (TURNSTILE_SECRET) {
      return this.useRecaptchaOrTurnstileCheck({
        secret: TURNSTILE_SECRET,
        token: turnstile,
        api: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        method: 'POST',
      });
    }

    // 其次使用 reCAPTCHA v3 验证
    if (RECAPTCHA_V3_SECRET) {
      return this.useRecaptchaOrTurnstileCheck({
        secret: RECAPTCHA_V3_SECRET,
        token: recaptchaV3,
        api: 'https://recaptcha.net/recaptcha/api/siteverify',
        method: 'GET',
      });
    }
  }

  // 执行验证码验证
  async useRecaptchaOrTurnstileCheck({ secret, token, api, method }) {
    think.logger.debug('【base】执行验证码验证');
    if (!secret) {
      return;
    }

    if (!token) {
      think.logger.error('【base】验证码验证失败 - 403错误: 缺少验证码令牌', {
        requestPath: this.ctx.path,
        requestMethod: this.ctx.method,
        clientIP: this.ctx.ip,
        userAgent: this.ctx.req.headers['user-agent'],
        hasSecret: !!secret,
        secretType:
          secret === process.env.TURNSTILE_SECRET
            ? 'TURNSTILE'
            : 'RECAPTCHA_V3',
      });

      return this.ctx.throw(403);
    }

    // 构建验证请求参数
    const query = qs.stringify({
      secret,
      response: token,
      remoteip: this.ctx.ip,
    });

    // 发送验证请求
    const requestUrl = method === 'GET' ? api + '?' + query : api;
    const options =
      method === 'GET'
        ? {}
        : {
            method,
            headers: {
              'content-type':
                'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: query,
          };

    const response = await fetch(requestUrl, options).then((resp) =>
      resp.json(),
    );

    // 处理验证结果
    if (!response.success) {
      think.logger.error('【base】验证码验证失败 - 403错误', {
        requestPath: this.ctx.path,
        requestMethod: this.ctx.method,
        clientIP: this.ctx.ip,
        userAgent: this.ctx.req.headers['user-agent'],
        api: api,
        method: method,
        verificationResponse: response,
        errorCodes: response['error-codes'] || [],
        secretType:
          secret === process.env.TURNSTILE_SECRET
            ? 'TURNSTILE'
            : 'RECAPTCHA_V3',
      });

      return this.ctx.throw(403);
    }

    think.logger.debug('【base】验证码验证通过', {
      secretType:
        secret === process.env.TURNSTILE_SECRET ? 'TURNSTILE' : 'RECAPTCHA_V3',
      score: response.score || 'N/A',
    });
  }
};

think.logger.debug(' 已加载/logic/base.js');
