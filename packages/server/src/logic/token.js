//引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  /**
   * @api {GET} /api/token  获取登录用户信息
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   * @apiSuccess  (200) {Object}  data 用户信息
   * @apiSuccess  (200) {String}  data.avatar 用户头像
   * @apiSuccess  (200) {String}  data.createdAt 用户注册时间
   * @apiSuccess  (200) {String}  data.display_name 用户昵称
   * @apiSuccess  (200) {String}  data.email 用户邮箱
   * @apiSuccess  (200) {String}  data.github GitHub账号
   * @apiSuccess  (200) {String}  data.mailMd5 邮箱MD5值
   * @apiSuccess  (200) {String}  data.objectId 用户ID
   * @apiSuccess  (200) {String}  data.type 用户类型（管理员或访客）
   * @apiSuccess  (200) {String}  data.url 用户链接
   */
  getAction() {
    think.logger.debug("【token】获取当前登录用户信息");
  }

  /**
   * @api {POST} /api/token 用户登录
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  email 登录邮箱
   * @apiParam  {String}  password 登录密码
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   */
  postAction() {
    think.logger.debug("【token】处理用户登录请求");

    return this.useCaptchaCheck();
  }

  /**
   * @api {DELETE} /api/token  用户登出
   * @apiGroup 用户
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  语言设置
   *
   * @apiSuccess  (200) {Number}  errno 0
   * @apiSuccess  (200) {String}  errmsg  错误信息（如果有错误）
   */
  deleteAction() {
    think.logger.debug("【token】处理用户登出请求");
  }
};

think.logger.debug(" 已加载/logic/token.js");
