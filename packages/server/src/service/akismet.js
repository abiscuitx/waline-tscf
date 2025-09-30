// 使用懒加载方式引入Akismet
let Akismet;

const load = {
  akismet: () => Akismet || (Akismet = require("akismet")),
};

// 默认的Akismet API密钥
const DEFAULT_KEY = "70542d86693e";

// 导出Akismet检查函数，用于检查评论是否为垃圾评论
module.exports = function (comment, blog) {
  // 从环境变量获取配置
  let { AKISMET_KEY, SITE_URL } = process.env;

  // 如果未配置密钥，使用默认密钥
  if (!AKISMET_KEY) {
    think.logger.debug("【Akismet】使用默认API密钥");
    AKISMET_KEY = DEFAULT_KEY;
  }

  // 如果密钥设置为false，跳过检查
  if (AKISMET_KEY.toLowerCase() === "false") {
    think.logger.debug("【Akismet】检查已禁用");

    return Promise.resolve(false);
  }

  // 返回Promise进行异步检查
  return new Promise(function (resolve, reject) {
    think.logger.debug("【Akismet】初始化反垃圾检查客户端");
    const akismet = load.akismet().client({ blog, apiKey: AKISMET_KEY });

    // 验证API密钥是否有效
    akismet.verifyKey(function (err, verifyKey) {
      if (err) {
        think.logger.debug("【Akismet】API密钥验证出错:", err);

        return reject(err);
      } else if (!verifyKey) {
        think.logger.debug("【Akismet】API密钥验证失败");

        return reject(new Error("Akismet API_KEY verify failed!"));
      }

      think.logger.debug("【Akismet】开始检查评论内容");
      akismet.checkComment(
        {
          user_ip: comment.ip, // 评论者IP地址
          permalink: SITE_URL + comment.url, // 评论页面的完整URL
          comment_author: comment.nick, // 评论者昵称
          comment_content: comment.comment, // 评论内容
        },
        function (err, spam) {
          if (err) {
            think.logger.debug("【Akismet】评论检查出错:", err);

            return reject(err);
          }
          think.logger.debug("【Akismet】评论检查完成，是否为垃圾评论:", spam);
          resolve(spam);
        }
      );
    });
  });
};

think.logger.debug(" 已加载/service/akismet.js");
