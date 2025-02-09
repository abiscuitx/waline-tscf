// 引入Node.js内置加密模块
let crypto, FormData, fetch, nodemailer, nunjucks;

// 懒加载辅助函数
const load = {
  crypto: () => crypto || (crypto = require("node:crypto")),
  formData: () => FormData || (FormData = require("form-data")),
  fetch: () => fetch || (fetch = require("node-fetch")),
  nodemailer: () => nodemailer || (nodemailer = require("nodemailer")),
  nunjucks: () => nunjucks || (nunjucks = require("nunjucks")),
};

// 导出通知服务类
module.exports = class extends think.Service {
  // 初始化通知服务
  constructor(ctx) {
    super(ctx);
    this.ctx = ctx;
  }

  // 从环境变量获取SMTP配置
  getTransporter() {
    if (!this._transporter) {
      const {
        SMTP_USER,
        SMTP_PASS,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_SERVICE,
      } = process.env;

      if (SMTP_HOST || SMTP_SERVICE) {
        think.logger.debug("【notify】配置SMTP邮件服务");
        const config = {
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        };

        if (SMTP_SERVICE) {
          config.service = SMTP_SERVICE;
        } else {
          config.host = SMTP_HOST;
          config.port = parseInt(SMTP_PORT);
          config.secure = SMTP_SECURE && SMTP_SECURE !== "false";
        }
        this._transporter = load.nodemailer().createTransport(config);
      } else {
        think.logger.debug("【notify】未配置SMTP服务，无法发送邮件");
      }
    }
    return this._transporter;
  }

  // 延迟执行指定秒数
  async sleep(second) {
    return new Promise((resolve) => setTimeout(resolve, second * 1000));
  }

  // 发送邮件通知
  async mail({ to, title, content }, self, parent) {
    const transporter = this.getTransporter();
    if (!transporter) {
      think.logger.debug("【notify】未配置SMTP服务，跳过邮件发送");
      return;
    }

    // 获取站点配置信息
    const { SITE_NAME, SITE_URL, SMTP_USER, SENDER_EMAIL, SENDER_NAME } =
      process.env;
    const data = {
      self,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    title = this.ctx.locale(title, data);
    content = this.ctx.locale(content, data);

    think.logger.debug(`【notify】准备发送邮件通知到 ${to}`);
    return transporter.sendMail({
      from:
        SENDER_EMAIL && SENDER_NAME
          ? `"${SENDER_NAME}" <${SENDER_EMAIL}>`
          : SMTP_USER,
      to,
      subject: title,
      html: content,
    });
  }

  // 发送Server酱微信通知
  async wechat({ title, content }, self, parent) {
    const { SC_KEY, SITE_NAME, SITE_URL } = process.env;

    if (!SC_KEY) {
      think.logger.debug("【notify】未配置Server酱密钥，跳过微信通知");
      return false;
    }

    think.logger.debug("【notify】准备发送Server酱微信通知");
    const data = {
      self,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    // 获取微信通知模板
    const contentWechat =
      think.config("SCTemplate") ||
      `{{site.name|safe}} 有新评论啦
【评论者昵称】：{{self.nick}}
【评论者邮箱】：{{self.mail}} 
【内容】：{{self.comment}}
【地址】：{{site.postUrl}}`;

    title = this.ctx.locale(title, data);
    content = this.ctx.locale(contentWechat, data);

    const FormData = load.formData();
    const form = new FormData();
    form.append("text", title);
    form.append("desp", content);

    think.logger.debug("【notify】发送Server酱请求");
    return load
      .fetch(`https://sctapi.ftqq.com/${SC_KEY}.send`, {
        method: "POST",
        headers: form.getHeaders(),
        body: form,
      })
      .then((resp) => resp.json());
  }

  // 企业微信应用消息通知
  async qywxAmWechat({ title, content }, self, parent) {
    const { QYWX_AM, QYWX_PROXY, QYWX_PROXY_PORT, SITE_NAME, SITE_URL } =
      process.env;

    if (!QYWX_AM) {
      return false;
    }

    // 解析企业微信配置参数
    const QYWX_AM_AY = QYWX_AM.split(",");
    // 清理评论内容中的HTML标签
    const comment = self.comment
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "\n[$2] $1\n")
      .replace(/<[^>]+>/g, "");
    const postName = self.url;

    // 构建通知数据
    const data = {
      self: {
        ...self,
        comment,
      },
      postName,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    // 获取企业微信通知模板
    const contentWechat =
      think.config("WXTemplate") ||
      `💬 {{site.name|safe}}的文章《{{postName}}》有新评论啦 
【评论者昵称】：{{self.nick}}
【评论者邮箱】：{{self.mail}} 
【内容】：{{self.comment}} 
<a href='{{site.postUrl}}'>查看详情</a>`;

    title = this.ctx.locale(title, data);
    const desp = this.ctx.locale(contentWechat, data);
    content = desp.replace(/\n/g, "<br/>");

    // 构建API请求参数
    const querystring = new URLSearchParams();
    querystring.set("corpid", `${QYWX_AM_AY[0]}`);
    querystring.set("corpsecret", `${QYWX_AM_AY[1]}`);

    // 设置API基础URL
    let baseUrl = "https://qyapi.weixin.qq.com";
    if (QYWX_PROXY) {
      if (!QYWX_PROXY_PORT) {
        baseUrl = `http://${QYWX_PROXY}`;
      } else {
        baseUrl = `http://${QYWX_PROXY}:${QYWX_PROXY_PORT}`;
      }
    }

    // 获取访问令牌
    const { access_token } = await load
      .fetch(`${baseUrl}/cgi-bin/gettoken?${querystring.toString()}`, {
        headers: {
          "content-type": "application/json",
        },
      })
      .then((resp) => resp.json());

    // 发送企业微信通知
    return load
      .fetch(`${baseUrl}/cgi-bin/message/send?access_token=${access_token}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          touser: `${QYWX_AM_AY[2]}`,
          agentid: `${QYWX_AM_AY[3]}`,
          msgtype: "mpnews",
          mpnews: {
            articles: [
              {
                title,
                thumb_media_id: `${QYWX_AM_AY[4]}`,
                author: `Waline Comment`,
                content_source_url: `${data.site.postUrl}`,
                content: `${content}`,
                digest: `${desp}`,
              },
            ],
          },
        }),
      })
      .then((resp) => resp.json());
  }

  // QQ消息通知
  async qq(self, parent) {
    const { QMSG_KEY, QQ_ID, SITE_NAME, SITE_URL, QMSG_HOST } = process.env;

    if (!QMSG_KEY) {
      return false;
    }

    // 清理评论内容中的HTML标签
    const comment = self.comment
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "")
      .replace(/<[^>]+>/g, "");

    // 构建通知数据
    const data = {
      self: {
        ...self,
        comment,
      },
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    // 获取QQ通知模板
    const contentQQ =
      think.config("QQTemplate") ||
      `💬 {{site.name|safe}} 有新评论啦
{{self.nick}} 评论道：
{{self.comment}}
仅供预览评论，请前往上述页面查看完整內容。`;

    const FormData = load.formData();
    const form = new FormData();
    form.append("msg", this.ctx.locale(contentQQ, data));
    form.append("qq", QQ_ID);

    // 获取消息发送服务地址
    const qmsgHost = QMSG_HOST
      ? QMSG_HOST.replace(/\/$/, "")
      : "https://qmsg.zendee.cn";

    // 发送QQ通知
    return load
      .fetch(`${qmsgHost}/send/${QMSG_KEY}`, {
        method: "POST",
        header: form.getHeaders(),
        body: form,
      })
      .then((resp) => resp.json());
  }

  // Telegram机器人通知
  async telegram(self, parent) {
    const { TG_BOT_TOKEN, TG_CHAT_ID, SITE_NAME, SITE_URL } = process.env;

    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      return false;
    }

    // 处理评论中的链接
    let commentLink = "";
    const href = self.comment.match(/<a href="(.*?)">(.*?)<\/a>/g);

    if (href !== null) {
      for (let i = 0; i < href.length; i++) {
        href[i] =
          "[Link: " +
          href[i].replace(/<a href="(.*?)">(.*?)<\/a>/g, "$2") +
          "](" +
          href[i].replace(/<a href="(.*?)">(.*?)<\/a>/g, "$1") +
          ")  ";
        commentLink = commentLink + href[i];
      }
    }
    if (commentLink !== "") {
      commentLink = `\n` + commentLink + `\n`;
    }

    // 清理评论内容中的HTML标签
    const comment = self.comment
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[Link:$2]")
      .replace(/<[^>]+>/g, "");

    // 获取Telegram通知模板
    const contentTG =
      think.config("TGTemplate") ||
      `💬 *[{{site.name}}]({{site.url}}) 有新评论啦*

*{{self.nick}}* 回复说：

\`\`\`
{{self.comment-}}
\`\`\`
{{-self.commentLink}}
*邮箱：*\`{{self.mail}}\`
*审核：*{{self.status}} 

仅供评论预览，点击[查看完整內容]({{site.postUrl}})`;

    // 构建通知数据
    const data = {
      self: {
        ...self,
        comment,
        commentLink,
      },
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    const FormData = load.formData();
    const form = new FormData();
    form.append("text", this.ctx.locale(contentTG, data));
    form.append("chat_id", TG_CHAT_ID);
    form.append("parse_mode", "MarkdownV2");

    // 发送Telegram通知
    const resp = await load
      .fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        header: form.getHeaders(),
        body: form,
      })
      .then((resp) => resp.json());

    if (!resp.ok) {
      think.logger.debug(
        "Telegram Notification Failed:" + JSON.stringify(resp)
      );
    }
  }

  // PushPlus推送通知
  async pushplus({ title, content }, self, parent) {
    const {
      PUSH_PLUS_KEY,
      PUSH_PLUS_TOPIC: topic,
      PUSH_PLUS_TEMPLATE: template,
      PUSH_PLUS_CHANNEL: channel,
      PUSH_PLUS_WEBHOOK: webhook,
      PUSH_PLUS_CALLBACKURL: callbackUrl,
      SITE_NAME,
      SITE_URL,
    } = process.env;

    if (!PUSH_PLUS_KEY) {
      return false;
    }

    // 构建通知数据
    const data = {
      self,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    title = this.ctx.locale(title, data);
    content = this.ctx.locale(content, data);

    // 构建请求表单
    const FormData = load.formData();
    const form = new FormData();
    if (topic) form.append("topic", topic);
    if (template) form.append("template", template);
    if (channel) form.append("channel", channel);
    if (webhook) form.append("webhook", webhook);
    if (callbackUrl) form.append("callbackUrl", callbackUrl);
    if (title) form.append("title", title);
    if (content) form.append("content", content);

    // 发送PushPlus通知
    return load
      .fetch(`http://www.pushplus.plus/send/${PUSH_PLUS_KEY}`, {
        method: "POST",
        header: form.getHeaders(),
        body: form,
      })
      .then((resp) => resp.json());
  }

  // Discord通知
  async discord({ title, content }, self, parent) {
    const { DISCORD_WEBHOOK, SITE_NAME, SITE_URL } = process.env;

    if (!DISCORD_WEBHOOK) {
      return false;
    }

    // 构建通知数据
    const data = {
      self,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    title = this.ctx.locale(title, data);
    // 获取Discord通知模板
    content = this.ctx.locale(
      think.config("DiscordTemplate") ||
        `💬 {{site.name|safe}} 有新评论啦 
    【评论者昵称】：{{self.nick}}
    【评论者邮箱】：{{self.mail}} 
    【内容】：{{self.comment}} 
    【地址】：{{site.postUrl}}`,
      data
    );

    const FormData = load.formData();
    const form = new FormData();
    form.append("content", `${title}\n${content}`);

    // 发送Discord通知
    return load
      .fetch(DISCORD_WEBHOOK, {
        method: "POST",
        header: form.getHeaders(),
        body: form,
      })
      .then((resp) => resp.statusText);
    // Discord成功时不返回响应体，只返回状态文本
  }

  async lark({ title, content }, self, parent) {
    const { LARK_WEBHOOK, LARK_SECRET, SITE_NAME, SITE_URL } = process.env;

    if (!LARK_WEBHOOK) {
      return false;
    }

    // 清理HTML标签
    self.comment = self.comment.replace(/(<([^>]+)>)/gi, "");

    // 构建通知数据
    const data = {
      self,
      parent,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + self.url + "#" + self.objectId,
      },
    };

    // 渲染通知内容
    content = load
      .nunjucks()
      .renderString(
        think.config("LarkTemplate") ||
          `【网站名称】：{{site.name|safe}} \n【评论者昵称】：{{self.nick}}\n【评论者邮箱】：{{self.mail}}\n【内容】：{{self.comment}}【地址】：{{site.postUrl}}`,
        data
      );

    // 构建飞书消息结构
    const post = {
      en_us: {
        title: this.ctx.locale(title, data),
        content: [
          [
            {
              tag: "text",
              text: content,
            },
          ],
        ],
      },
    };

    // 处理签名数据
    let signData = {};
    const msg = {
      msg_type: "post",
      content: {
        post,
      },
    };

    // 生成签名
    const sign = (timestamp, secret) => {
      const signStr = timestamp + "\n" + secret;
      return load
        .crypto()
        .createHmac("sha256", signStr)
        .update("")
        .digest("base64");
    };

    // 如果配置了密钥，添加签名
    if (LARK_SECRET) {
      const timestamp = parseInt(+new Date() / 1000);
      signData = { timestamp: timestamp, sign: sign(timestamp, LARK_SECRET) };
    }

    // 发送飞书通知
    const resp = await load
      .fetch(LARK_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...signData,
          ...msg,
        }),
      })
      .then((resp) => resp.json());

    if (resp.status !== 200) {
      think.logger.debug("Lark Notification Failed:" + JSON.stringify(resp));
    }

    think.logger.debug("FeiShu Notification Success:" + JSON.stringify(resp));
  }

  // 执行通知流程
  async run(comment, parent, disableAuthorNotify = false) {
    think.logger.debug("【notify】开始执行评论通知");
    const { AUTHOR_EMAIL, DISABLE_AUTHOR_NOTIFY } = process.env;
    const { mailSubject, mailTemplate, mailSubjectAdmin, mailTemplateAdmin } =
      think.config();
    const AUTHOR = AUTHOR_EMAIL;

    const mailList = [];
    // 判断评论相关状态
    const isAuthorComment = AUTHOR
      ? (comment.mail || "").toLowerCase() === AUTHOR.toLowerCase()
      : false;
    const isReplyAuthor = AUTHOR
      ? parent && (parent.mail || "").toLowerCase() === AUTHOR.toLowerCase()
      : false;
    const isCommentSelf =
      parent &&
      (parent.mail || "").toLowerCase() === (comment.mail || "").toLowerCase();

    const title = mailSubjectAdmin || "MAIL_SUBJECT_ADMIN";
    const content = mailTemplateAdmin || "MAIL_TEMPLATE_ADMIN";

    // 处理作者通知
    if (!DISABLE_AUTHOR_NOTIFY && !isAuthorComment && !disableAuthorNotify) {
      think.logger.debug("【notify】准备发送作者通知");
      const wechat = await this.wechat({ title, content }, comment, parent);
      const qywxAmWechat = await this.qywxAmWechat(
        { title, content },
        comment,
        parent
      );
      const qq = await this.qq(comment, parent);
      const telegram = await this.telegram(comment, parent);
      const pushplus = await this.pushplus({ title, content }, comment, parent);
      const discord = await this.discord({ title, content }, comment, parent);
      const lark = await this.lark({ title, content }, comment, parent);

      // 如果所有通知方式都失败，使用邮件通知
      if (
        [wechat, qq, telegram, qywxAmWechat, pushplus, discord, lark].every(
          think.isEmpty
        )
      ) {
        mailList.push({ to: AUTHOR, title, content });
      }
    }

    // 过滤社交媒体邮箱
    const disallowList = ["github", "twitter", "facebook", "qq", "weibo"].map(
      (social) => "mail." + social
    );
    const fakeMail = new RegExp(`@(${disallowList.join("|")})$`, "i");

    // 处理回复通知
    if (
      parent &&
      !fakeMail.test(parent.mail) &&
      !isCommentSelf &&
      !isReplyAuthor &&
      comment.status !== "waiting"
    ) {
      think.logger.debug("【notify】准备发送回复通知");
      mailList.push({
        to: parent.mail,
        title: mailSubject || "MAIL_SUBJECT",
        content: mailTemplate || "MAIL_TEMPLATE",
      });
    }

    // 发送所有邮件通知
    for (const mail of mailList) {
      try {
        const response = await this.mail(mail, comment, parent);
        think.logger.debug("【notify】邮件发送成功", response);
      } catch (e) {
        think.logger.debug("【notify】邮件发送失败:", e);
      }
    }
  }
};

think.logger.debug(" 已加载/service/notify.js");
