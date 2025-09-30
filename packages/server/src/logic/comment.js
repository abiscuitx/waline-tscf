//引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  // 检查是否具有管理员权限
  checkAdmin() {
    think.logger.debug("【comment】检查管理员权限");
    const { userInfo } = this.ctx.state;

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.warn("【comment】拒绝访问: 用户未登录");

      return this.ctx.throw(401);
    }

    // 检查用户是否为管理员
    if (userInfo.type !== "administrator") {
      think.logger.warn("【comment】拒绝访问: 用户非管理员");

      return this.ctx.throw(403);
    }
  }

  /**
   * @api {GET} /api/comment Get comment list for client
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  path  comment url path
   * @apiParam  {String}  page  page
   * @apiParam  {String}  pageSize  page size
   * @apiParam  {String}  sortBy  comment sort type, one of 'insertedAt_desc', 'insertedAt_asc', 'like_desc'
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Number}  page return current comments list page
   * @apiSuccess  (200) {Number}  pageSize  to  return error message if error
   * @apiSuccess  (200) {Object[]}  data  comments list
   * @apiSuccess  (200) {String}  data.nick comment user nick name
   * @apiSuccess  (200) {String}  data.mail comment user mail md5
   * @apiSuccess  (200) {String}  data.link comment user link
   * @apiSuccess  (200) {String}  data.objectId comment id
   * @apiSuccess  (200) {String}  data.browser comment user browser
   * @apiSuccess  (200) {String}  data.os comment user os
   * @apiSuccess  (200) {String}  data.insertedAt comment created time
   * @apiSuccess  (200) {String}  data.avatar comment user avatar
   * @apiSuccess  (200) {String}  data.type comment login user type
   * @apiSuccess  (200) {Object[]}  data.children children comments list
   * @apiSuccess  (200) {String}  data.children.nick comment user nick name
   * @apiSuccess  (200) {String}  data.children.mail comment user mail md5
   * @apiSuccess  (200) {String}  data.children.link comment user link
   * @apiSuccess  (200) {String}  data.children.objectId comment id
   * @apiSuccess  (200) {String}  data.children.browser comment user browser
   * @apiSuccess  (200) {String}  data.children.os comment user os
   * @apiSuccess  (200) {String}  data.children.insertedAt comment created time
   * @apiSuccess  (200) {String}  data.children.avatar comment user avatar
   * @apiSuccess  (200) {String}  data.children.type comment login user type
   */
  /**
   * @api {GET} /api/comment?type=list Get comment list for admin
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  page  page
   * @apiParam  {String}  pageSize  page size
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  return error message if error
   * @apiSuccess  (200) {Object}  data
   * @apiSuccess  (200) {Number}  data.page comments list current page
   * @apiSuccess  (200) {Number}  data.pageSize comments list page size
   * @apiSuccess  (200) {Number}  data.totalPages comments list total pages
   * @apiSuccess  (200) {Number}  data.spamCount spam comments count
   * @apiSuccess  (200) {Number}  data.waitingCount waiting comments count
   * @apiSuccess  (200) {Object[]}  data.data comments list data
   * @apiSuccess  (200) {String}  data.data.ip comment user ip address
   * @apiSuccess  (200) {String}  data.data.nick comment user nick name
   * @apiSuccess  (200) {String}  data.data.mail comment user mail md5
   * @apiSuccess  (200) {String}  data.data.link comment user link
   * @apiSuccess  (200) {String}  data.data.objectId comment id
   * @apiSuccess  (200) {String}  data.data.status comment status, approved, waiting or spam
   * @apiSuccess  (200) {String}  data.data.ua  comment user agent
   * @apiSuccess  (200) {String}  data.data.insertedAt comment created time
   * @apiSuccess  (200) {String}  data.data.avatar comment user avatar
   * @apiSuccess  (200) {String}  data.data.url comment article link
   */
  /**
   * @api {GET} /api/comment?type=count Get comment count for articles
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  url a array string join by comma just like `a` or `a,b`, return site comment count if url empty
   * @apiParam  {String}  lang  language
   *
   * @apiSuccessExample {Number} Single Path Response:
   * 300
   * @apiSuccessExample {Number} Multiple Path Response:
   * [300, 100]
   */
  /**
   * @api {GET} /api/comment?type=recent Get recent comments
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  count return comments number, default value is 10
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Object[]} response
   * @apiSuccess  (200) {String}  response.nick comment user nick name
   * @apiSuccess  (200) {String}  response.mail comment user mail md5
   * @apiSuccess  (200) {String}  response.link comment user link
   * @apiSuccess  (200) {String}  response.objectId comment id
   * @apiSuccess  (200) {String}  response.browser comment user browser
   * @apiSuccess  (200) {String}  response.os comment user os
   * @apiSuccess  (200) {String}  response.insertedAt comment created time
   * @apiSuccess  (200) {String}  response.avatar comment user avatar
   * @apiSuccess  (200) {String}  response.type comment login user type
   */
  getAction() {
    const { type, path } = this.get();
    // think.logger.debug('【评论】this.get()结果:', this.get());

    // 检查是否允许获取评论列表
    const isAllowedGet = type !== "list" || path;

    if (!isAllowedGet) {
      // think.logger.debug('【评论】需要管理员权限');
      this.checkAdmin();
    }

    // 根据不同类型设置不同的验证规则
    switch (type) {
      case "recent":
        // think.logger.debug('【评论】获取最近评论');
        this.rules = {
          count: {
            int: { max: 50 }, // 最大返回50条评论
            default: 10, // 默认返回10条评论
          },
        };
        break;

      case "count":
        // think.logger.debug('【评论】获取评论数量');
        this.rules = {
          url: {
            array: true, // URL必须是数组格式
          },
        };
        break;

      case "list": {
        // think.logger.debug('【评论】获取评论列表');
        const { userInfo } = this.ctx.state;

        // 检查管理员权限
        if (userInfo.type !== "administrator") {
          // think.logger.debug('【评论】非管理员，拒绝访问');
          think.logger.warn("【comment】拒绝访问: 非管理员请求评论列表");

          return this.fail();
        }
        this.rules = {
          page: {
            int: true, // 页码必须是整数
            default: 1, // 默认第1页
          },
          pageSize: {
            int: { max: 100 }, // 每页最多100条
            default: 10, // 默认每页10条
          },
        };
        break;
      }

      default:
        // think.logger.debug('【评论】设置验证规则前的参数:', path);
        this.rules = {
          path: {
            string: true, // 路径必须是字符串
            required: true, // 路径为必填项
          },
          page: {
            int: true, // 页码必须是整数
            default: 1, // 默认第1页
          },
          pageSize: {
            int: { max: 100 }, // 每页最多100条
            default: 10, // 默认每页10条
          },
          sortBy: {
            in: ["insertedAt_desc", "insertedAt_asc", "like_desc"], // 排序方式限制
            default: "insertedAt_desc", // 默认按时间倒序
          },
        };
        break;
    }
  }

  /**
   * @api {POST} /api/comment post comment
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  nick post comment user nick name
   * @apiParam  {String}  mail  post comment user mail address
   * @apiParam  {String}  link  post comment user link
   * @apiParam  {String}  comment  post comment text
   * @apiParam  {String}  url  the article url path of comment
   * @apiParam  {String}  ua  browser user agent
   * @apiParam  {String}  pid parent comment id
   * @apiParam  {String}  rid root comment id
   * @apiParam  {String}  at  parent comment user nick name
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  return error message if error
   * @apiSuccess  (200) {Object}  data  return comment data
   * @apiSuccess  (200) {String}  data.nick comment user nick name
   * @apiSuccess  (200) {String}  data.mail comment user mail md5
   * @apiSuccess  (200) {String}  data.link comment user link
   * @apiSuccess  (200) {String}  data.objectId comment id
   * @apiSuccess  (200) {String}  data.browser comment user browser
   * @apiSuccess  (200) {String}  data.os comment user os
   * @apiSuccess  (200) {String}  data.insertedAt comment created time
   * @apiSuccess  (200) {String}  data.avatar comment user avatar
   * @apiSuccess  (200) {String}  data.type comment login user type
   */
  async postAction() {
    think.logger.debug("【comment】处理发表评论请求");
    const { LOGIN } = process.env;
    const { userInfo } = this.ctx.state;

    // 设置评论提交的验证规则
    this.rules = {
      url: {
        string: true, // URL必须是字符串
        required: true, // URL为必填项
      },
      comment: {
        string: true, // 评论内容必须是字符串
        required: true, // 评论内容为必填项
      },
    };

    // 已登录用户无需验证
    if (!think.isEmpty(userInfo)) {
      return;
    }

    // 检查是否强制要求登录
    if (LOGIN === "force") {
      think.logger.warn("【comment】拒绝评论: 需要登录");

      return this.ctx.throw(401);
    }

    // 执行验证码检查
    think.logger.debug("【comment】开始验证码检查");

    return this.useCaptchaCheck();
  }

  /**
   * @api {PUT} /api/comment/:id update comment data
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  [nick] post comment user nick name
   * @apiParam  {String}  [mail]  post comment user mail address
   * @apiParam  {String}  [link]  post comment user link
   * @apiParam  {String}  [comment]  post comment text
   * @apiParam  {String}  [url]  the article url path of comment
   * @apiParam  {Boolean} [like] like comment
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  return error message if error
   */
  async putAction() {
    think.logger.debug("【comment】处理评论更新");
    const { userInfo } = this.ctx.state;
    const data = this.post();

    // 处理点赞操作
    if (think.isBoolean(data.like) && Object.keys(data).toString() === "like") {
      think.logger.debug("【comment】处理点赞更新");

      return;
    }

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.warn("【comment】拒绝更新: 用户未登录");

      return this.ctx.throw(401);
    }

    // 管理员可以修改任何评论
    if (userInfo.type === "administrator") {
      return;
    }

    // 检查是否为评论作者
    const modelInstance = this.getModel("Comment");
    const commentData = await modelInstance.select({
      user_id: userInfo.objectId,
      objectId: this.id,
    });

    if (!think.isEmpty(commentData)) {
      return;
    }

    think.logger.warn("【comment】拒绝更新: 用户无权限");

    return this.ctx.throw(403);
  }

  /**
   * @api {DELETE} /api/comment/:id delete comment
   * @apiGroup Comment
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  return error message if error
   */
  async deleteAction() {
    think.logger.debug("【comment】处理评论删除");
    const { userInfo } = this.ctx.state;

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.warn("【comment】拒绝删除: 用户未登录");

      return this.ctx.throw(401);
    }

    // 管理员可以删除任何评论
    if (userInfo.type === "administrator") {
      return;
    }

    // 检查是否为评论作者
    const modelInstance = this.getModel("Comment");
    const commentData = await modelInstance.select({
      user_id: userInfo.objectId,
      objectId: this.id,
    });

    if (!think.isEmpty(commentData)) {
      return;
    }

    think.logger.warn("【comment】拒绝删除: 用户无权限");

    return this.ctx.throw(403);
  }
};

think.logger.debug(" 已加载/logic/comment.js");
