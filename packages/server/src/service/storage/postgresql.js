const MySQL = require("./mysql.js");

function mapKeys({ insertedat, createdat, updatedat, ...item }) {
  const mapFields = {
    insertedAt: insertedat,
    createdAt: createdat,
    updatedAt: updatedat,
  };

  for (const field in mapFields) {
    if (!mapFields[field]) {
      continue;
    }
    item[field] = mapFields[field];
  }

  return item;
}

module.exports = class extends MySQL {
  model(tableName) {
    return super.model(tableName.toLowerCase());
  }

  async select(where, options = {}) {
    const lowerWhere = {};

    for (const i in where) {
      lowerWhere[i.toLowerCase()] = where[i];
    }

    if (options?.desc) {
      options.desc = options.desc.toLowerCase();
    }

    if (Array.isArray(options.field)) {
      options.field = options.field.map((field) => field.toLowerCase());
    }

    const data = await super.select(lowerWhere, options);

    think.logger.debug("【postgresql】查询数据完成", {
      条件: lowerWhere,
      选项: options,
    });

    return data.map(mapKeys);
  }

  async add(data) {
    ["insertedAt", "createdAt", "updatedAt"]
      .filter((key) => data[key])
      .forEach((key) => {
        const val = data[key];

        data[key.toLowerCase()] =
          val instanceof Date
            ? think.datetime(val, "YYYY-MM-DD HH:mm:ss")
            : val;
        delete data[key];
      });

    const result = await super.add(data).then(mapKeys);

    think.logger.debug("【postgresql】添加数据完成", { 数据: result });

    return result;
  }

  async count(...args) {
    let result = await super.count(...args);

    try {
      if (Array.isArray(result)) {
        result.forEach((r) => {
          r.count = parseInt(r.count);
        });
      } else {
        result = parseInt(result);
      }
    } catch (e) {
      think.logger.warn("【postgresql】计数出错:", e);
    }

    think.logger.debug("【postgresql】计数完成", { 结果: result });

    return result;
  }

  async setSeqId(id) {
    const instance = this.model(this.tableName);

    return instance.query(
      `ALTER SEQUENCE ${instance.tableName}_seq RESTART WITH ${id};`
    );
  }
};

think.logger.debug(" 已加载/service/storage/postgresql.js");
