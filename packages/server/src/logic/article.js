// 引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  // 获取文章统计信息的验证规则
  getAction() {
    think.logger.debug("【article】设置获取统计信息的验证规则");

    // 设置请求参数的验证规则
    this.rules = {
      path: { array: true }, // 文章路径必须是数组格式
      type: {
        array: true, // 统计类型必须是数组格式
        default: ["time"], // 默认为时间统计类型
      },
    };
  }

  // 更新文章统计数据的验证规则
  postAction() {
    think.logger.debug("【article】设置更新统计信息的验证规则");

    // 设置请求参数的验证规则
    this.rules = {
      path: {
        string: true, // 文章路径必须是字符串
      },
      type: {
        string: true, // 统计类型必须是字符串
        default: "time", // 默认为时间统计类型
      },
      action: {
        string: true, // 操作类型必须是字符串
        in: ["inc", "desc"], // 只允许增加或减少操作
        default: "inc", // 默认为增加操作
      },
    };
  }
};

think.logger.debug(" 已加载/logic/article.js");
