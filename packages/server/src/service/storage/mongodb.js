const { MONGO_DB, MONGO_PASSWORD } = process.env;

// 如果缺少必要的环境变量配置，直接返回空类
if (!MONGO_DB || !MONGO_PASSWORD) {
  module.exports = class {};

  return;
}
// 引入MongoDB ObjectId类型
const { ObjectID: ObjectId } = require("think-mongo/lib/model");

// 引入基础存储类
const Base = require("./base.js");

// 添加缓存相关变量
const CACHE_EXPIRE = 12 * 60 * 60 * 1000; // 12小时过期
const mongoCache = {
  select: new Map(),
  count: new Map(),
};

// 缓存辅助函数
function getCacheKey(method, params) {
  return JSON.stringify({ method, params });
}

function getCache(method, params) {
  const key = getCacheKey(method, params);
  // think.logger.debug('【MongoDB】缓存键值:', key);
  const cache = mongoCache[method].get(key);

  if (cache && Date.now() - cache.timestamp < CACHE_EXPIRE) {
    // think.logger.debug(`【MongoDB】从缓存获取${method}数据`);
    think.logger.debug("【mongodb】从缓存获取数据", {
      方法: method,
      参数: params,
    });

    return cache.data;
  }

  return null;
}

function setCache(method, params, data) {
  const key = getCacheKey(method, params);

  // think.logger.debug('【MongoDB】设置缓存，键值:', key);
  mongoCache[method].set(key, {
    data,
    timestamp: Date.now(),
  });
  think.logger.debug("【mongodb】设置缓存", { 方法: method, 参数: params });
}

function clearCache() {
  // think.logger.debug('【MongoDB】清除MongoDB相关缓存');
  think.logger.debug("【mongodb】清除MongoDB相关缓存");
  mongoCache.select.clear();
  mongoCache.count.clear();
}

module.exports = class extends Base {
  // 解析查询条件为MongoDB格式
  parseWhere(where) {
    think.logger.debug("【mongodb】开始解析查询条件", { 条件: where });
    if (think.isEmpty(where)) {
      return {};
    }

    const filter = {};
    // 转换字段名，将objectId转换为MongoDB的_id
    const parseKey = (k) => (k === "objectId" ? "_id" : k);

    for (let k in where) {
      if (k === "_complex") {
        continue;
      }
      // 处理字符串类型的等值查询
      if (think.isString(where[k])) {
        filter[parseKey(k)] = {
          $eq: k === "objectId" ? ObjectId(where[k]) : where[k],
        };
        continue;
      }
      // 处理undefined值为null
      if (where[k] === undefined) {
        filter[parseKey(k)] = { $eq: null };
      }
      // 处理数组类型的复杂查询
      if (Array.isArray(where[k])) {
        if (where[k][0]) {
          const handler = where[k][0].toUpperCase();

          switch (handler) {
            case "IN":
              // IN查询，对objectId特殊处理
              if (k === "objectId") {
                filter[parseKey(k)] = { $in: where[k][1].map(ObjectId) };
              } else {
                filter[parseKey(k)] = {
                  $regex: new RegExp(`^(${where[k][1].join("|")})$`),
                };
              }
              break;
            case "NOT IN":
              // NOT IN查询，对objectId特殊处理
              filter[parseKey(k)] = {
                $nin:
                  k === "objectId" ? where[k][1].map(ObjectId) : where[k][1],
              };
              break;
            case "LIKE": {
              // LIKE查询，支持前缀、后缀和包含匹配
              const first = where[k][1][0];
              const last = where[k][1].slice(-1);
              let reg;

              if (first === "%" && last === "%") {
                reg = new RegExp(where[k][1].slice(1, -1));
              } else if (first === "%") {
                reg = new RegExp(where[k][1].slice(1) + "$");
              } else if (last === "%") {
                reg = new RegExp("^" + where[k][1].slice(0, -1));
              }

              if (reg) {
                filter[parseKey(k)] = { $regex: reg };
              }
              break;
            }
            case "!=":
              // 不等于查询
              filter[parseKey(k)] = { $ne: where[k][1] };
              break;
            case ">":
              // 大于查询
              filter[parseKey(k)] = { $gt: where[k][1] };
              break;
          }
        }
      }
    }

    think.logger.debug("【mongodb】查询条件解析完成", { 结果: filter });

    return filter;
  }

  // 构建MongoDB查询条件
  where(instance, where) {
    think.logger.debug("【mongodb】构建查询条件");
    const filter = this.parseWhere(where);

    if (!where._complex) {
      return instance.where(filter);
    }

    // 处理复杂查询条件
    const filters = [];

    for (const k in where._complex) {
      if (k === "_logic") {
        continue;
      }
      filters.push({
        ...this.parseWhere({ [k]: where._complex[k] }),
        ...filter,
      });
    }

    return instance.where({
      // $or, $and, $not, $nor
      [`$${where._complex._logic}`]: filters,
    });
  }

  // 修改 select 方法
  async select(where, options = {}) {
    // 尝试获取缓存
    const cacheData = getCache("select", { where, options });

    if (cacheData) return cacheData;
    // think.logger.debug('【MongoDB】执行查询操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);

        this.where(instance, where);
        if (options.desc) {
          instance.order(`${options.desc} DESC`);
        }
        if (options.limit || options.offset) {
          instance.limit(options.offset || 0, options.limit);
        }
        if (options.field) {
          instance.field(options.field);
        }

        const data = await instance.select();
        const result = data.map(({ _id, ...cmt }) => ({
          ...cmt,
          objectId: _id.toString(),
        }));

        // 设置缓存
        setCache("select", { where, options }, result);

        return result;
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== "MongoServerError") {
          throw err;
        }
        // think.logger.warn(`【MongoDB】查询操作失败，剩余重试次数: ${retries}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // 修改 count 方法
  async count(where = {}, options = {}) {
    // 尝试获取缓存
    const cacheData = getCache("count", { where, options });

    if (cacheData) return cacheData;
    // think.logger.debug('【MongoDB】执行统计操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);

        this.where(instance, where);
        if (options.group) {
          instance.group(options.group);
        }
        const data = await instance.count({ raw: options.group });
        const result = Array.isArray(data)
          ? data.map(({ _id, total: count }) => ({ ..._id, count }))
          : data;

        // 设置缓存
        setCache("count", { where, options }, result);

        return result;
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== "MongoServerError") {
          throw err;
        }
        // think.logger.warn(`【MongoDB】统计操作失败，剩余重试次数: ${retries}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // 添加数据
  async add(data) {
    // think.logger.debug('【MongoDB】执行添加操作');
    let retries = 3;

    while (retries > 0) {
      try {
        if (data.objectId) {
          data._id = data.objectId;
          delete data.objectId;
        }

        const instance = this.mongo(this.tableName);
        const id = await instance.add(data);

        clearCache(); // 添加数据后清除缓存

        return { ...data, objectId: id.toString() };
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== "MongoServerError") {
          throw err;
        }
        // think.logger.warn(`【MongoDB】添加操作失败，剩余重试次数: ${retries}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // 更新数据
  async update(data, where) {
    // think.logger.debug('【MongoDB】执行更新操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);

        this.where(instance, where);
        const list = await instance.select();

        // 批量更新数据
        const result = await Promise.all(
          list.map(async (item) => {
            const updateData = typeof data === "function" ? data(item) : data;
            const instance = this.mongo(this.tableName);

            this.where(instance, where);
            await instance.update(updateData);

            return { ...item, ...updateData };
          })
        );

        clearCache(); // 更新数据后清除缓存

        return result;
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== "MongoServerError") {
          throw err;
        }
        // think.logger.warn(`【MongoDB】更新操作失败，剩余重试次数: ${retries}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // 删除数据
  async delete(where) {
    // think.logger.debug('【MongoDB】执行删除操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);

        this.where(instance, where);
        clearCache();

        return instance.delete();
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== "MongoServerError") {
          throw err;
        }
        // think.logger.warn(`【MongoDB】删除操作失败，剩余重试次数: ${retries}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
};

think.logger.debug(" 已加载/service/storage/mongodb.js");
