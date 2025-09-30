//引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  /**
   * @api {GET} /api/user 获取用户排行榜（非管理员）
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  pageSize  每页数量
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   * @apiSuccess  (200) {Object[]}  data  用户列表
   * @apiSuccess  (200) {String}  data.nick 用户昵称
   * @apiSuccess  (200) {String}  data.link 用户链接
   * @apiSuccess  (200) {String}  data.avatar 用户头像
   * @apiSuccess  (200) {String}  data.level 用户等级
   * @apiSuccess  (200) {String}  data.count 用户评论数
   */
  /**
   * @api {GET} /api/user?token 获取用户列表（管理员）
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  page  页码
   * @apiParam  {String}  pageSize  每页数量
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   * @apiSuccess  (200) {Object}  data  用户列表数据
   * @apiSuccess  (200) {Number}  data.page 当前页码
   * @apiSuccess  (200) {Number}  data.pageSize 每页数量
   * @apiSuccess  (200) {Number}  data.totalPages 总页数
   * @apiSuccess  (200) {Object[]}  data.data 用户列表
   * @apiSuccess  (200) {String}  data.data.nick 用户昵称
   * @apiSuccess  (200) {String}  data.data.link 用户链接
   * @apiSuccess  (200) {String}  data.data.avatar 用户头像
   * @apiSuccess  (200) {String}  data.data.level 用户等级
   * @apiSuccess  (200) {String}  data.data.label 用户标签
   */
  getAction() {
    think.logger.debug("【user】处理获取用户列表请求");
    const { userInfo } = this.ctx.state;

    // 非管理员用户获取排行榜
    if (think.isEmpty(userInfo) || userInfo.type !== "administrator") {
      think.logger.debug("【user】非管理员获取用户排行榜");
      this.rules = {
        pageSize: {
          int: { max: 50 }, // 最多返回50条
          default: 20, // 默认返回20条
        },
      };

      return;
    }

    // 管理员获取完整用户列表
    think.logger.debug("【user】管理员获取完整用户列表");
    this.rules = {
      page: {
        int: true, // 页码必须是整数
        default: 1, // 默认第1页
      },
      pageSize: {
        int: { max: 100 }, // 每页最多100条
        default: 10, // 默认每页10条
      },
      email: {
        string: true, // 邮箱必须是字符串
      },
    };
  }

  /**
   * @api {POST} /api/user 用户注册
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  display_name  用户昵称
   * @apiParam  {String}  email 用户邮箱
   * @apiParam  {String}  password 用户密码
   * @apiParam  {String}  url 用户链接
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   */
  postAction() {
    think.logger.debug("【user】处理用户注册请求");

    // 执行验证码检查
    return this.useCaptchaCheck();
  }

  /**
   * @api {PUT} /api/user 更新用户资料
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  [display_name]  新昵称
   * @apiParam  {String}  [url] 新链接
   * @apiParam  {String}  [password] 新密码
   * @apiParam  {String}  [github] GitHub账号
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   */
  putAction() {
    think.logger.debug("【user】处理更新用户资料请求");
    const { userInfo } = this.ctx.state;

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.debug("【user】用户未登录，拒绝访问");

      return this.fail();
    }

    // 检查是否有权限修改其他用户信息
    if (this.id && userInfo.type !== "administrator") {
      think.logger.debug("【user】非管理员尝试修改其他用户信息，拒绝访问");

      return this.fail();
    }
  }
};

think.logger.debug(" 已加载/logic/user.js");
