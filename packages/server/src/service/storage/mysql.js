const { MYSQL_DB, PG_DB, POSTGRES_DATABASE, TIDB_DB } = process.env;

// 如果缺少必要的环境变量配置，直接返回空类
if (!MYSQL_DB || !PG_DB || !POSTGRES_DATABASE || !TIDB_DB) {
  module.exports = class {};

  return;
}

const Base = require("./base.js");

module.exports = class extends Base {
  parseWhere(filter) {
    const where = {};

    if (think.isEmpty(filter)) {
      return where;
    }

    for (const k in filter) {
      if (k === "objectId" || k === "objectid") {
        where.id = filter[k];
        continue;
      }

      if (k === "_complex") {
        where[k] = this.parseWhere(filter[k]);
        continue;
      }

      if (filter[k] === undefined) {
        where[k] = null;
        continue;
      }

      if (Array.isArray(filter[k])) {
        if (filter[k][0] === "IN" && !filter[k][1].length) {
          continue;
        }
        if (think.isDate(filter[k][1])) {
          filter[k][1] = think.datetime(filter[k][1]);
        }
      }

      where[k] = filter[k];
    }

    think.logger.debug("【mysql】解析查询条件完成", { 条件: where });

    return where;
  }

  async select(where, { desc, limit, offset, field } = {}) {
    const instance = this.model(this.tableName);

    instance.where(this.parseWhere(where));
    if (desc) {
      instance.order({ [desc]: "DESC" });
    }
    if (limit || offset) {
      instance.limit(offset || 0, limit);
    }
    if (field) {
      field.push("id");
      instance.field(field);
    }

    const data = await instance.select();

    think.logger.debug("【mysql】查询数据完成", { 数据: data });

    return data.map(({ id, ...cmt }) => ({ ...cmt, objectId: id }));
  }

  async count(where = {}, { group } = {}) {
    const instance = this.model(this.tableName);

    instance.where(this.parseWhere(where));
    if (!group) {
      return instance.count();
    }

    instance.field([...group, "COUNT(*) as count"].join(","));
    instance.group(group);

    return instance.select();
  }

  async add(data) {
    if (data.objectId) {
      data.id = data.objectId;
      delete data.objectId;
    }
    const date = new Date();

    if (!data.createdAt) data.createdAt = date;
    if (!data.updatedAt) data.updatedAt = date;

    const instance = this.model(this.tableName);
    const id = await instance.add(data);

    think.logger.debug("【mysql】添加数据完成", {
      数据: { ...data, objectId: id },
    });

    return { ...data, objectId: id };
  }

  async update(data, where) {
    const list = await this.model(this.tableName)
      .where(this.parseWhere(where))
      .select();

    think.logger.debug("【mysql】更新数据开始", { 条件: where });

    return Promise.all(
      list.map(async (item) => {
        const updateData = typeof data === "function" ? data(item) : data;

        await this.model(this.tableName)
          .where({ id: item.id })
          .update(updateData);

        think.logger.debug("【mysql】更新数据完成", {
          数据: { ...item, ...updateData },
        });

        return { ...item, ...updateData };
      })
    );
  }

  async delete(where) {
    const instance = this.model(this.tableName);

    think.logger.debug("【mysql】执行删除操作", { 条件: where });

    return instance.where(this.parseWhere(where)).delete();
  }

  async setSeqId(id) {
    const instance = this.model(this.tableName);

    return instance.query(
      `ALTER TABLE ${instance.tableName} AUTO_INCREMENT = ${id};`
    );
  }
};

think.logger.debug(" 已加载/service/storage/mysql.js");
