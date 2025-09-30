// 引入基础 REST 控制器
const BaseRest = require("./rest.js");

let akismet;

const load = {
  akismet: () => akismet || (akismet = require("../service/akismet.js")),
  markdown: () => require("../service/markdown/index.js"),
  base: () => require("./rest.js"),
};

const markdownParser = load.markdown().getMarkdownParser();

// 在类定义开始处添加缓存相关变量
const CACHE_EXPIRE = 12 * 60 * 60 * 1000; // 12小时过期
const commentCache = {
  list: new Map(),
  admin: new Map(),
  recent: new Map(),
  count: new Map(),
};

// 缓存辅助函数
function getCacheKey(type, params) {
  return JSON.stringify({ type, params });
}

function getCache(type, params) {
  const key = getCacheKey(type, params);
  const cache = commentCache[type].get(key);

  if (cache && Date.now() - cache.timestamp < CACHE_EXPIRE) {
    think.logger.debug(`【comment】从缓存获取${type}数据`);

    return cache.data;
  }

  return null;
}

function setCache(type, params, data) {
  const key = getCacheKey(type, params);

  commentCache[type].set(key, {
    data,
    timestamp: Date.now(),
  });
}

function clearCache() {
  think.logger.debug("【comment】清除评论相关缓存");
  commentCache.list.clear();
  commentCache.admin.clear();
  commentCache.recent.clear();
  commentCache.count.clear();
}

async function formatCmt(
  { ua, ip, ...comment },
  users = [],
  { avatarProxy, deprecated },
  loginUser
) {
  // 解析用户代理信息
  ua = think.uaParser(ua);
  if (!think.config("disableUserAgent")) {
    comment.browser = `${ua.browser.name || ""}${(ua.browser.version || "")
      .split(".")
      .slice(0, 2)
      .join(".")}`;
    comment.os = [ua.os.name, ua.os.version].filter((v) => v).join(" ");
  }
  // 查找并补充用户信息
  const user = users.find(({ objectId }) => comment.user_id === objectId);

  if (!think.isEmpty(user)) {
    comment.nick = user.display_name;
    comment.mail = user.email;
    comment.link = user.url;
    comment.type = user.type;
    comment.label = user.label;
  }
  // 处理头像 URL
  const avatarUrl = user?.avatar
    ? user.avatar
    : await think.service("avatar").stringify(comment);

  comment.avatar =
    avatarProxy && !avatarUrl.includes(avatarProxy)
      ? avatarProxy + "?url=" + encodeURIComponent(avatarUrl)
      : avatarUrl;

  const isAdmin = loginUser && loginUser.type === "administrator";

  // 处理评论内容和权限
  if (loginUser) {
    comment.orig = comment.comment;
  }
  if (!isAdmin) {
    delete comment.mail;
  } else {
    comment.ip = ip;
  }
  // 管理员始终可以显示地区信息
  if (isAdmin || !think.config("disableRegion")) {
    comment.addr = await think.ip2region(ip, { depth: isAdmin ? 3 : 1 });
  }
  comment.comment = markdownParser(comment.comment);
  comment.like = Number(comment.like) || 0;
  // 兼容 SQL 存储返回的数字标记为字符串
  if (typeof comment.sticky === "string") {
    comment.sticky = Boolean(Number(comment.sticky));
  }
  // 处理时间格式
  comment.time = new Date(comment.insertedAt).getTime();
  if (!deprecated) {
    delete comment.insertedAt;
  }
  delete comment.createdAt;
  delete comment.updatedAt;

  return comment;
}

module.exports = class extends BaseRest {
  // 构造函数：初始化评论模型实例
  constructor(ctx) {
    super(ctx);
    this.modelInstance = this.getModel("Comment");
  }
  // 获取评论列表的处理方法
  async getAction() {
    const { type } = this.get();
    // 评论获取方式映射表
    const fnMap = {
      recent: this.getRecentCommentList,
      count: this.getCommentCount,
      list: this.getAdminCommentList,
    };

    think.logger.debug("【comment】开始处理获取评论请求，类型:", type);
    const fn = fnMap[type] || this.getCommentList;
    const data = await fn.call(this);

    return this.jsonOrSuccess(data);
  }

  async postAction() {
    think.logger.debug("【comment】开始处理新评论提交");

    const { comment, link, mail, nick, pid, rid, ua, url, at } = this.post();
    const data = {
      link,
      mail,
      nick,
      pid,
      rid,
      ua,
      url,
      comment,
      ip: this.ctx.ip,
      insertedAt: new Date(),
      user_id: this.ctx.state.userInfo.objectId,
    };

    if (pid && this.ctx.state.deprecated) {
      data.comment = `[@${at}](#${pid}): ` + data.comment;
    }

    think.logger.debug("【comment】评论初始数据准备完成");

    const { userInfo } = this.ctx.state;

    if (!userInfo || userInfo.type !== "administrator") {
      /** IP 黑名单检查 */
      const { disallowIPList } = this.config();

      if (
        think.isArray(disallowIPList) &&
        disallowIPList.length &&
        disallowIPList.includes(data.ip)
      ) {
        think.logger.debug(`【comment】IP ${data.ip} 在黑名单中，拒绝评论`);

        return this.ctx.throw(403);
      }

      think.logger.debug("【comment】IP 检查通过");

      /** 重复内容检测 */
      const duplicate = await this.modelInstance.select({
        url,
        mail: data.mail,
        nick: data.nick,
        link: data.link,
        comment: data.comment,
      });

      if (!think.isEmpty(duplicate)) {
        think.logger.debug("【comment】检测到重复评论内容");

        return this.fail(this.locale("Duplicate Content"));
      }

      /** IP 频率限制 */
      const { IPQPS = 10 } = process.env;

      think.logger.debug(this.ctx.ip);
      const recent = await this.modelInstance.select({
        ip: this.ctx.ip,
        insertedAt: [">", new Date(Date.now() - IPQPS * 1000)],
      });

      if (!think.isEmpty(recent)) {
        think.logger.debug(`【comment】评论频率超限：${IPQPS}秒内已发表评论`);

        return this.fail(this.locale("Comment too fast"));
      }

      /** 垃圾评论检测 */
      data.status = this.config("audit") ? "waiting" : "approved";
      think.logger.debug(`【comment】初始评论状态: ${data.status}`);

      if (data.status === "approved") {
        const spam = await load
          .akismet()(data, this.ctx.serverURL)
          .catch((err) => think.logger.debug(err)); // 忽略 akismet 错误

        if (spam === true) {
          data.status = "spam";
        }
      }

      think.logger.debug(`【comment】垃圾评论检查结果: ${data.status}`);

      if (data.status !== "spam") {
        /** 关键词过滤 */
        const { forbiddenWords } = this.config();

        if (!think.isEmpty(forbiddenWords)) {
          const regexp = new RegExp("(" + forbiddenWords.join("|") + ")", "ig");

          if (regexp.test(comment)) {
            data.status = "spam";
          }
        }
      }

      think.logger.debug(`【comment】关键词过滤检查完成: ${data.status}`);
    } else {
      data.status = "approved";
    }

    const preSaveResp = await this.hook("preSave", data);

    if (preSaveResp) {
      return this.fail(preSaveResp.errmsg);
    }

    think.logger.debug("【comment】preSave 钩子执行完成");

    const resp = await this.modelInstance.add(data);

    think.logger.debug("【comment】评论已保存到数据库");

    let parentComment;
    let parentUser;

    if (pid) {
      parentComment = await this.modelInstance.select({ objectId: pid });
      parentComment = parentComment[0];
      if (parentComment.user_id) {
        parentUser = await this.getModel("Users").select({
          objectId: parentComment.user_id,
        });
        parentUser = parentUser[0];
      }
    }

    await this.ctx.webhook("new_comment", {
      comment: { ...resp, rawComment: comment },
      reply: parentComment,
    });

    const cmtReturn = await formatCmt(
      resp,
      [userInfo],
      { ...this.config(), deprecated: this.ctx.state.deprecated },
      userInfo
    );
    const parentReturn = parentComment
      ? await formatCmt(
          parentComment,
          parentUser ? [parentUser] : [],
          { ...this.config(), deprecated: this.ctx.state.deprecated },
          userInfo
        )
      : undefined;

    if (comment.status !== "spam") {
      const notify = this.service("notify", this);

      await notify.run(
        { ...cmtReturn, mail: resp.mail, rawComment: comment },
        parentReturn ? { ...parentReturn, mail: parentComment.mail } : undefined
      );
    }

    think.logger.debug("【comment】评论通知处理完成");

    await this.hook("postSave", resp, parentComment);
    think.logger.debug("【comment】postSave 钩子执行完成");

    clearCache();

    return this.success(
      await formatCmt(
        resp,
        [userInfo],
        { ...this.config(), deprecated: this.ctx.state.deprecated },
        userInfo
      )
    );
  }

  async putAction() {
    const { userInfo } = this.ctx.state;
    const isAdmin = userInfo.type === "administrator";
    let data = isAdmin ? this.post() : this.post("comment,like");
    let oldData = await this.modelInstance.select({ objectId: this.id });

    think.logger.debug("【comment】开始处理评论更新请求");

    if (think.isEmpty(oldData) || think.isEmpty(data)) {
      return this.success();
    }

    oldData = oldData[0];
    // 处理点赞操作
    if (think.isBoolean(data.like)) {
      const likeIncMax = this.config("LIKE_INC_MAX") || 1;

      data.like =
        (Number(oldData.like) || 0) +
        (data.like ? Math.ceil(Math.random() * likeIncMax) : -1);
      data.like = Math.max(data.like, 0);

      think.logger.debug("【comment】处理点赞数据，新的点赞数:", data.like);
    }

    // 执行更新前钩子
    const preUpdateResp = await this.hook("preUpdate", {
      ...data,
      objectId: this.id,
    });

    if (preUpdateResp) {
      think.logger.debug("【comment】更新前钩子返回错误");

      return this.fail(preUpdateResp);
    }

    // 更新评论数据
    const newData = await this.modelInstance.update(data, {
      objectId: this.id,
    });

    think.logger.debug("【comment】评论数据已更新");

    // 获取评论用户信息
    let cmtUser;

    if (!think.isEmpty(newData) && newData[0].user_id) {
      cmtUser = await this.getModel("Users").select({
        objectId: newData[0].user_id,
      });
      cmtUser = cmtUser[0];
    }

    // 格式化评论数据
    const cmtReturn = await formatCmt(
      newData[0],
      cmtUser ? [cmtUser] : [],
      { ...this.config(), deprecated: this.ctx.state.deprecated },
      userInfo
    );

    // 处理评论审核通过的通知
    if (
      oldData.status === "waiting" &&
      data.status === "approved" &&
      oldData.pid
    ) {
      think.logger.debug("【comment】处理评论审核通过通知");
      let pComment = await this.modelInstance.select({
        objectId: oldData.pid,
      });

      pComment = pComment[0];

      let pUser;

      if (pComment.user_id) {
        pUser = await this.getModel("Users").select({
          objectId: pComment.user_id,
        });
        pUser = pUser[0];
      }

      const notify = this.service("notify", this);
      const pcmtReturn = await formatCmt(
        pComment,
        pUser ? [pUser] : [],
        { ...this.config(), deprecated: this.ctx.state.deprecated },
        userInfo
      );

      await notify.run(
        { ...cmtReturn, mail: newData[0].mail },
        { ...pcmtReturn, mail: pComment.mail },
        true
      );

      think.logger.debug("【comment】审核通过通知已发送");
    }

    // 执行更新后钩子
    await this.hook("postUpdate", data);
    think.logger.debug("【comment】更新后钩子执行完成");

    clearCache();

    return this.success(cmtReturn);
  }

  async deleteAction() {
    think.logger.debug("【comment】开始处理删除评论请求");

    // 执行删除前钩子
    const preDeleteResp = await this.hook("preDelete", this.id);

    if (preDeleteResp) {
      think.logger.debug("【comment】删除前钩子返回错误");

      return this.fail(preDeleteResp);
    }

    // 删除评论及其关联评论
    await this.modelInstance.delete({
      _complex: {
        _logic: "or",
        objectId: this.id,
        pid: this.id,
        rid: this.id,
      },
    });

    think.logger.debug("【comment】评论及其关联评论已删除");

    // 执行删除后钩子
    await this.hook("postDelete", this.id);
    think.logger.debug("【comment】删除后钩子执行完成");

    clearCache();

    return this.success();
  }

  // 获取评论列表
  async getCommentList() {
    // 尝试获取缓存
    const cacheData = getCache("list", this.get());

    if (cacheData) return cacheData;

    const { userInfo } = this.ctx.state;
    const { path: url, page, pageSize, sortBy } = this.get();
    const where = { url };

    // 根据用户权限设置查询条件
    if (think.isEmpty(userInfo) || this.config("storage") === "deta") {
      where.status = ["NOT IN", ["waiting", "spam"]];
    } else if (userInfo.type !== "administrator") {
      where._complex = {
        _logic: "or",
        status: ["NOT IN", ["waiting", "spam"]],
        user_id: userInfo.objectId,
      };
    }

    const totalCount = await this.modelInstance.count(where);
    const pageOffset = Math.max((page - 1) * pageSize, 0);
    let comments = [];
    let rootComments = [];
    let rootCount = 0;

    // 设置查询字段
    const selectOptions = {
      field: [
        "status",
        "comment",
        "insertedAt",
        "link",
        "mail",
        "nick",
        "pid",
        "rid",
        "ua",
        "ip",
        "user_id",
        "sticky",
        "like",
      ],
    };

    // 处理排序
    if (sortBy) {
      const [field, order] = sortBy.split("_");

      if (order === "desc") {
        selectOptions.desc = field;
      } else if (order === "asc") {
        // 默认为升序，无需特殊处理
      }
    }

    think.logger.debug("【comment】评论总数:", totalCount);

    /**
     * 评论数据获取策略说明：
     * 1. 当评论数少于1000时，一次性获取所有评论
     * 2. 这样可以减少对存储服务的查询次数，特别是在 serverless 环境下
     * 3. 为什么限制在1000条？
     *    - 很多 serverless 存储服务有数据获取限制，比如 LeanCloud 是100条，CloudBase 是1000条
     *    - 如果评论数过多，需要多次请求获取
     *    - 比如3000条评论需要30次请求，这会增加复杂度
     *    - 而且 serverless 服务比如 vercel 有执行时间限制
     *    - 如果 HTTP 请求太多可能导致超时
     *    - 所以使用限制来避免这些问题
     */
    if (totalCount < 1000) {
      think.logger.debug("【comment】评论数小于1000，一次性获取所有评论");
      comments = await this.modelInstance.select(where, selectOptions);
      rootCount = comments.filter(({ rid }) => !rid).length;
      rootComments = [
        ...comments.filter(({ rid, sticky }) => !rid && sticky),
        ...comments.filter(({ rid, sticky }) => !rid && !sticky),
      ].slice(pageOffset, pageOffset + pageSize);
      const rootIds = {};

      rootComments.forEach(({ objectId }) => {
        rootIds[objectId] = true;
      });
      comments = comments.filter(
        (cmt) => rootIds[cmt.objectId] || rootIds[cmt.rid]
      );
    } else {
      think.logger.debug("【comment】评论数过多，分批获取评论数据");
      comments = await this.modelInstance.select(
        { ...where, rid: undefined },
        { ...selectOptions }
      );
      rootCount = comments.length;
      rootComments = [
        ...comments.filter(({ rid, sticky }) => !rid && sticky),
        ...comments.filter(({ rid, sticky }) => !rid && !sticky),
      ].slice(pageOffset, pageOffset + pageSize);

      const children = await this.modelInstance.select(
        {
          ...where,
          rid: ["IN", rootComments.map(({ objectId }) => objectId)],
        },
        selectOptions
      );

      comments = [...rootComments, ...children];
      think.logger.debug("【comment】子评论获取完成");
    }

    // 获取用户信息
    const userModel = this.getModel("Users");
    const user_ids = Array.from(
      new Set(comments.map(({ user_id }) => user_id).filter((v) => v))
    );
    let users = [];

    if (user_ids.length) {
      think.logger.debug("【comment】开始获取评论用户信息");
      users = await userModel.select(
        { objectId: ["IN", user_ids] },
        {
          field: ["display_name", "email", "url", "type", "avatar", "label"],
        }
      );
    }

    // 处理用户等级
    if (think.isArray(this.config("levels"))) {
      think.logger.debug("【comment】开始处理用户等级信息");
      const countWhere = {
        status: ["NOT IN", ["waiting", "spam"]],
        _complex: {},
      };

      if (user_ids.length) {
        countWhere._complex.user_id = ["IN", user_ids];
      }
      const mails = Array.from(
        new Set(comments.map(({ mail }) => mail).filter((v) => v))
      );

      if (mails.length) {
        countWhere._complex.mail = ["IN", mails];
      }
      if (!think.isEmpty(countWhere._complex)) {
        countWhere._complex._logic = "or";
      } else {
        delete countWhere._complex;
      }
      const counts = await this.modelInstance.count(countWhere, {
        group: ["user_id", "mail"],
      });

      comments.forEach((cmt) => {
        const countItem = (counts || []).find(({ mail, user_id }) =>
          cmt.user_id ? user_id === cmt.user_id : mail === cmt.mail
        );

        cmt.level = think.getLevel(countItem?.count);
      });
    }

    think.logger.debug("【comment】评论数据处理完成，准备返回");

    const result = {
      page,
      totalPages: Math.ceil(rootCount / pageSize),
      pageSize,
      count: totalCount,
      data: await Promise.all(
        rootComments.map(async (comment) => {
          const cmt = await formatCmt(
            comment,
            users,
            { ...this.config(), deprecated: this.ctx.state.deprecated },
            userInfo
          );

          cmt.children = await Promise.all(
            comments
              .filter(({ rid }) => rid === cmt.objectId)
              .map((cmt) =>
                formatCmt(
                  cmt,
                  users,
                  {
                    ...this.config(),
                    deprecated: this.ctx.state.deprecated,
                  },
                  userInfo
                )
              )
              .reverse()
          );

          const childCommentsMap = new Map();

          childCommentsMap.set(cmt.objectId, cmt);
          cmt.children.forEach((c) => childCommentsMap.set(c.objectId, c));

          cmt.children.forEach((c) => {
            const parent = childCommentsMap.get(c.pid);

            // 修复异常评论数据问题
            if (!parent) {
              return;
            }

            c.reply_user = {
              nick: parent?.nick,
              link: parent?.link,
              avatar: parent?.avatar,
            };
          });

          return cmt;
        })
      ),
    };

    // 设置缓存
    setCache("list", this.get(), result);

    return result;
  }

  // 获取管理员评论列表
  async getAdminCommentList() {
    // 尝试获取缓存
    const cacheData = getCache("admin", this.get());

    if (cacheData) return cacheData;

    const { userInfo } = this.ctx.state;
    const { page, pageSize, owner, status, keyword } = this.get();
    const where = {};

    think.logger.debug("【comment】开始获取管理员评论列表");

    // 处理所属者筛选
    if (owner === "mine") {
      const { userInfo } = this.ctx.state;

      where.mail = userInfo.email;
      think.logger.debug("【comment】筛选当前用户的评论");
    }

    // 处理状态筛选
    if (status) {
      where.status = status;

      // 兼容 valine 旧数据，处理无 status 属性的情况
      if (status === "approved") {
        where.status = ["NOT IN", ["waiting", "spam"]];
      }
      think.logger.debug("【comment】按状态筛选评论:", status);
    }

    // 处理关键词搜索
    if (keyword) {
      where.comment = ["LIKE", `%${keyword}%`];
      think.logger.debug("【comment】按关键词搜索评论:", keyword);
    }

    // 获取评论统计数据
    const count = await this.modelInstance.count(where);
    const spamCount = await this.modelInstance.count({ status: "spam" });
    const waitingCount = await this.modelInstance.count({
      status: "waiting",
    });

    think.logger.debug(
      "【comment】评论统计 - 总数:",
      count,
      "垃圾评论:",
      spamCount,
      "待审核:",
      waitingCount
    );

    // 获取评论列表
    const comments = await this.modelInstance.select(where, {
      desc: "insertedAt",
      limit: pageSize,
      offset: Math.max((page - 1) * pageSize, 0),
    });

    // 获取评论用户信息
    const userModel = this.getModel("Users");
    const user_ids = Array.from(
      new Set(comments.map(({ user_id }) => user_id).filter((v) => v))
    );

    let users = [];

    if (user_ids.length) {
      think.logger.debug("【comment】获取评论用户信息");
      users = await userModel.select(
        { objectId: ["IN", user_ids] },
        {
          field: ["display_name", "email", "url", "type", "avatar", "label"],
        }
      );
    }

    think.logger.debug("【comment】管理员评论列表数据处理完成");

    const result = {
      page,
      totalPages: Math.ceil(count / pageSize),
      pageSize,
      spamCount,
      waitingCount,
      data: await Promise.all(
        comments.map((cmt) =>
          formatCmt(
            cmt,
            users,
            { ...this.config(), deprecated: this.ctx.state.deprecated },
            userInfo
          )
        )
      ),
    };

    // 设置缓存
    setCache("admin", this.get(), result);

    return result;
  }

  // 获取最近评论列表
  async getRecentCommentList() {
    // 尝试获取缓存
    const cacheData = getCache("recent", this.get());

    if (cacheData) return cacheData;

    const { count } = this.get();
    const { userInfo } = this.ctx.state;
    const where = {};

    think.logger.debug("【comment】开始获取最近评论列表");

    // 设置查询条件
    if (think.isEmpty(userInfo) || this.config("storage") === "deta") {
      where.status = ["NOT IN", ["waiting", "spam"]];
    } else {
      where._complex = {
        _logic: "or",
        status: ["NOT IN", ["waiting", "spam"]],
        user_id: userInfo.objectId,
      };
    }

    // 获取评论数据
    const comments = await this.modelInstance.select(where, {
      desc: "insertedAt",
      limit: count,
      field: [
        "status",
        "comment",
        "insertedAt",
        "link",
        "mail",
        "nick",
        "url",
        "pid",
        "rid",
        "ua",
        "ip",
        "user_id",
        "sticky",
        "like",
      ],
    });

    think.logger.debug("【comment】获取到最近评论数:", comments.length);

    // 获取用户信息
    const userModel = this.getModel("Users");
    const user_ids = Array.from(
      new Set(comments.map(({ user_id }) => user_id).filter((v) => v))
    );

    let users = [];

    if (user_ids.length) {
      think.logger.debug("【comment】获取评论用户信息");
      users = await userModel.select(
        { objectId: ["IN", user_ids] },
        {
          field: ["display_name", "email", "url", "type", "avatar", "label"],
        }
      );
    }

    think.logger.debug("【comment】最近评论列表数据处理完成");

    const result = Promise.all(
      comments.map((cmt) =>
        formatCmt(
          cmt,
          users,
          { ...this.config(), deprecated: this.ctx.state.deprecated },
          userInfo
        )
      )
    );

    // 设置缓存
    setCache("recent", this.get(), result);

    return result;
  }

  // 获取评论计数
  async getCommentCount() {
    // 尝试获取缓存
    const cacheData = getCache("count", this.get());

    if (cacheData) return cacheData;

    const { url } = this.get();
    const { userInfo } = this.ctx.state;
    const where = Array.isArray(url) && url.length ? { url: ["IN", url] } : {};

    think.logger.debug("【comment】开始获取评论计数");

    // 设置查询条件
    if (think.isEmpty(userInfo) || this.config("storage") === "deta") {
      where.status = ["NOT IN", ["waiting", "spam"]];
    } else {
      where._complex = {
        _logic: "or",
        status: ["NOT IN", ["waiting", "spam"]],
        user_id: userInfo.objectId,
      };
    }

    // 处理多 URL 计数
    if (Array.isArray(url) && (url.length > 1 || !this.ctx.state.deprecated)) {
      think.logger.debug("【comment】处理多 URL 评论计数");
      const data = await this.modelInstance.select(where, {
        field: ["url"],
      });

      const counts = url.map((u) => data.filter(({ url }) => url === u).length);

      think.logger.debug("【comment】多 URL 评论计数完成");

      return counts;
    }

    // 处理单 URL 计数
    const data = await this.modelInstance.count(where);

    think.logger.debug("【comment】单 URL 评论计数完成:", data);

    return data;
  }
};

think.logger.debug(" 已加载/controller/comment.js");
