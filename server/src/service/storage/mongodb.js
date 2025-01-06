// 引入MongoDB ObjectId类型
const { ObjectID: ObjectId } = require('think-mongo/lib/model');


// 引入基础存储类
const Base = require('./base.js');

module.exports = class extends Base {
  // 解析查询条件为MongoDB格式
  parseWhere(where) {
    think.logger.debug('【MongoDB】开始解析查询条件:', JSON.stringify(where));
    if (think.isEmpty(where)) {
      return {};
    }

    const filter = {};
    // 转换字段名，将objectId转换为MongoDB的_id
    const parseKey = (k) => (k === 'objectId' ? '_id' : k);

    for (let k in where) {
      if (k === '_complex') {
        continue;
      }
      // 处理字符串类型的等值查询
      if (think.isString(where[k])) {
        filter[parseKey(k)] = {
          $eq: k === 'objectId' ? ObjectId(where[k]) : where[k],
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
            case 'IN':
              // IN查询，对objectId特殊处理
              if (k === 'objectId') {
                filter[parseKey(k)] = { $in: where[k][1].map(ObjectId) };
              } else {
                filter[parseKey(k)] = {
                  $regex: new RegExp(`^(${where[k][1].join('|')})$`),
                };
              }
              break;
            case 'NOT IN':
              // NOT IN查询，对objectId特殊处理
              filter[parseKey(k)] = {
                $nin:
                  k === 'objectId' ? where[k][1].map(ObjectId) : where[k][1],
              };
              break;
            case 'LIKE': {
              // LIKE查询，支持前缀、后缀和包含匹配
              const first = where[k][1][0];
              const last = where[k][1].slice(-1);
              let reg;

              if (first === '%' && last === '%') {
                reg = new RegExp(where[k][1].slice(1, -1));
              } else if (first === '%') {
                reg = new RegExp(where[k][1].slice(1) + '$');
              } else if (last === '%') {
                reg = new RegExp('^' + where[k][1].slice(0, -1));
              }

              if (reg) {
                filter[parseKey(k)] = { $regex: reg };
              }
              break;
            }
            case '!=':
              // 不等于查询
              filter[parseKey(k)] = { $ne: where[k][1] };
              break;
            case '>':
              // 大于查询
              filter[parseKey(k)] = { $gt: where[k][1] };
              break;
          }
        }
      }
    }

    think.logger.debug('【MongoDB】查询条件解析完成, 结果:', JSON.stringify(filter));
    return filter;
  }

  // 构建MongoDB查询条件
  where(instance, where) {
    think.logger.debug('【MongoDB】构建查询条件');
    const filter = this.parseWhere(where);

    if (!where._complex) {
      return instance.where(filter);
    }

    // 处理复杂查询条件
    const filters = [];

    for (const k in where._complex) {
      if (k === '_logic') {
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

  // 查询数据列表
  async select(where, { desc, limit, offset, field } = {}) {
    think.logger.debug('【MongoDB】执行查询操作');
    let retries = 3;
    
    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        if (desc) {
          instance.order(`${desc} DESC`);
        }
        if (limit || offset) {
          instance.limit(offset || 0, limit);
        }
        if (field) {
          instance.field(field);
        }

        const data = await instance.select();
        return data.map(({ _id, ...cmt }) => ({
          ...cmt,
          objectId: _id.toString(),
        }));
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== 'MongoServerError') {
          throw err;
        }
        think.logger.warn(`【MongoDB】查询操作失败，剩余重试次数: ${retries}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // 统计数据
  async count(where = {}, { group } = {}) {
    think.logger.debug('【MongoDB】执行统计操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        if (group) {
          instance.group(group);
        }
        const data = await instance.count({ raw: group });
        return Array.isArray(data) 
          ? data.map(({ _id, total: count }) => ({ ..._id, count }))
          : data;
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== 'MongoServerError') {
          throw err;
        }
        think.logger.warn(`【MongoDB】统计操作失败，剩余重试次数: ${retries}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // 添加数据
  async add(data) {
    think.logger.debug('【MongoDB】执行添加操作');
    let retries = 3;

    while (retries > 0) {
      try {
        if (data.objectId) {
          data._id = data.objectId;
          delete data.objectId;
        }

        const instance = this.mongo(this.tableName);
        const id = await instance.add(data);
        return { ...data, objectId: id.toString() };
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== 'MongoServerError') {
          throw err;
        }
        think.logger.warn(`【MongoDB】添加操作失败，剩余重试次数: ${retries}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // 更新数据
  async update(data, where) {
    think.logger.debug('【MongoDB】执行更新操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        const list = await instance.select();

        // 批量更新数据
        return Promise.all(
          list.map(async (item) => {
            const updateData = typeof data === 'function' ? data(item) : data;
            const instance = this.mongo(this.tableName);
            this.where(instance, where);
            await instance.update(updateData);
            return { ...item, ...updateData };
          }),
        );
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== 'MongoServerError') {
          throw err;
        }
        think.logger.warn(`【MongoDB】更新操作失败，剩余重试次数: ${retries}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // 删除数据
  async delete(where) {
    think.logger.debug('【MongoDB】执行删除操作');
    let retries = 3;

    while (retries > 0) {
      try {
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        return instance.delete();
      } catch (err) {
        retries--;
        if (retries === 0 || err.name !== 'MongoServerError') {
          throw err;
        }
        think.logger.warn(`【MongoDB】删除操作失败，剩余重试次数: ${retries}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
};
