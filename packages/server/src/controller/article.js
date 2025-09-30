const BaseRest = require("./rest.js");

module.exports = class extends BaseRest {
  // 构造函数：初始化文章计数控制器类
  constructor(ctx) {
    super(ctx);
    this.modelInstance = this.getModel("Counter");
  }

  // 处理获取计数请求的方法
  async getAction() {
    const { path, type } = this.get();
    const { deprecated } = this.ctx.state;

    think.logger.debug("【article】开始获取计数信息", {
      请求路径: path,
      计数类型: type,
    });

    // 验证路径参数的有效性
    if (!Array.isArray(path) || !path.length) {
      think.logger.debug("【article】错误：请求路径参数无效或为空数组");

      return this.jsonOrSuccess(0);
    }

    // 从数据库中查询指定路径的所有计数记录
    const resp = await this.modelInstance.select({ url: ["IN", path] });

    // 处理数据库中没有记录的情况
    if (think.isEmpty(resp)) {
      think.logger.debug("【article】数据库中未找到记录，开始初始化计数器");
      // 根据请求类型创建初始计数数组
      const counters = new Array(path.length).fill(
        type.length === 1 && deprecated
          ? 0
          : type.reduce((o, field) => {
              o[field] = 0;

              return o;
            }, {})
      );

      // 返回格式说明：
      // - 旧版本(deprecated):
      //   - 单路径单类型: 0
      //   - 单路径多类型: {[type]: 0}
      //   - 多路径单类型: [0, 0]
      //   - 多路径多类型: [{[type]: 0},{[type]: 0}]
      // - 新版本:
      //   - 单路径单类型: [{[type]: 0}]
      //   - 单路径多类型: [{[type]: 0}]
      //   - 多路径单类型: [{[type]: 0}]
      //   - 多路径多类型: [{[type]: 0}]
      return this.jsonOrSuccess(
        path.length === 1 && deprecated ? counters[0] : counters
      );
    }

    think.logger.debug("【article】找到现有记录，开始处理计数数据");
    // 将数据库记录转换为以URL为键的映射对象
    const respObj = resp.reduce((o, n) => {
      o[n.url] = n;

      return o;
    }, {});

    const data = [];

    // 遍历所有请求路径，整理计数数据
    for (const url of path) {
      let counters = {};

      // 获取每种类型的计数值，不存在则默认为0
      for (const field of type) {
        counters[field] = respObj[url]?.[field] ? respObj[url][field] : 0;
      }

      // 处理旧版本API的特殊返回格式
      if (type.length === 1 && deprecated) {
        counters = counters[type[0]];
      }
      data.push(counters);
    }

    think.logger.debug("【article】数据处理完成，准备返回计数结果");

    return this.jsonOrSuccess(path.length === 1 && deprecated ? data[0] : data);
  }

  // 处理更新计数请求的方法
  async postAction() {
    const { path, type, action } = this.post();

    think.logger.debug("【article】收到计数更新请求", {
      请求路径: path,
      计数类型: type,
      操作类型: action,
    });

    // 查询当前路径的计数记录
    const resp = await this.modelInstance.select({ url: path });
    const { deprecated } = this.ctx.state;

    // 处理数据库中没有记录的情况
    if (think.isEmpty(resp)) {
      if (action === "desc") {
        think.logger.debug("【article】新记录请求减少操作，返回默认值0");

        return this.jsonOrSuccess(deprecated ? 0 : [0]);
      }

      const count = 1;

      think.logger.debug("【article】创建新的计数记录，初始值设为1");

      // 创建新的计数记录并设置访问权限
      await this.modelInstance.add(
        { url: path, [type]: count },
        { access: { read: true, write: true } }
      );

      return this.jsonOrSuccess(deprecated ? count : [count]);
    }

    think.logger.debug("【article】更新现有计数记录");
    // 更新计数值：
    // - 当action为desc时，将当前值减1（如果当前值不存在则从1开始减）
    // - 当action为其他值时，将当前值加1（如果当前值不存在则从0开始加）
    const ret = await this.modelInstance.update(
      (counter) => ({
        [type]:
          action === "desc"
            ? (counter[type] || 1) - 1
            : (counter[type] || 0) + 1,
        updatedAt: new Date(),
      }),
      { objectId: ["IN", resp.map(({ objectId }) => objectId)] }
    );

    return this.jsonOrSuccess(
      deprecated ? ret[0][type] : [{ [type]: ret[0][type] }]
    );
  }
};

think.logger.debug(" 已加载/controller/article.js");
