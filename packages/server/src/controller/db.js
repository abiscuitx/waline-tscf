const BaseRest = require("./rest.js");

module.exports = class extends BaseRest {
  // 导出数据库数据的处理方法
  async getAction() {
    think.logger.debug("【db】开始导出数据");

    // 构建导出数据的基础结构
    const exportData = {
      type: "waline",
      version: 1,
      time: Date.now(),
      tables: ["Comment", "Counter", "Users"],
      data: {
        Comment: [],
        Counter: [],
        Users: [],
      },
    };

    // 遍历所有表并导出数据
    for (const tableName of exportData.tables) {
      think.logger.debug(`【db】正在导出 ${tableName} 表数据`);
      const model = this.getModel(tableName);
      const data = await model.select({});

      exportData.data[tableName] = data;
    }

    think.logger.debug("【db】数据导出完成");

    return this.success(exportData);
  }

  // 导入数据到指定表的处理方法
  async postAction() {
    const { table } = this.get();
    const item = this.post();
    const storage = this.config("storage");
    const model = this.getModel(table);

    think.logger.debug(`【db】开始导入数据到 ${table} 表`);

    // 针对 LeanCloud 和 MySQL 存储的时间字段处理
    if (storage === "leancloud" || storage === "mysql") {
      if (item.insertedAt) item.insertedAt = new Date(item.insertedAt);
      if (item.createdAt) item.createdAt = new Date(item.createdAt);
      if (item.updatedAt) item.updatedAt = new Date(item.updatedAt);
    }

    // MySQL 存储需要特殊的时间格式处理
    if (storage === "mysql") {
      if (item.insertedAt)
        item.insertedAt = think.datetime(
          item.insertedAt,
          "YYYY-MM-DD HH:mm:ss"
        );
      if (item.createdAt)
        item.createdAt = think.datetime(item.createdAt, "YYYY-MM-DD HH:mm:ss");
      if (item.updatedAt)
        item.updatedAt = think.datetime(item.updatedAt, "YYYY-MM-DD HH:mm:ss");
    }

    // 移除 objectId 避免冲突
    delete item.objectId;
    const resp = await model.add(item);

    think.logger.debug(`【db】数据导入完成`);

    return this.success(resp);
  }

  // 更新表中指定记录的处理方法
  async putAction() {
    const { table, objectId } = this.get();
    const data = this.post();
    const model = this.getModel(table);

    think.logger.debug(`【db】开始更新 ${table} 表数据，ID: ${objectId}`);

    // 移除不需要更新的系统字段
    delete data.objectId;
    delete data.createdAt;
    delete data.updatedAt;
    await model.update(data, { objectId });

    think.logger.debug(`【db】数据更新完成`);

    return this.success();
  }

  // 清空指定表的处理方法
  async deleteAction() {
    const { table } = this.get();
    const model = this.getModel(table);

    think.logger.debug(`【db】开始清空 ${table} 表数据`);
    await model.delete({});
    think.logger.debug(`【db】表数据清空完成`);

    return this.success();
  }
};

think.logger.debug(" 已加载/controller/db.js");
