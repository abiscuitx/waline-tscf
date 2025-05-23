const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_PATH } = process.env;
// 如果缺少必要的环境变量配置，直接返回空类
if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_PATH) {
  module.exports = class {};
  return;
}

let path, parseString, writeToString;

const load = {
  path: () => path || (path = require("node:path")),
  fastCsv: () => {
    if (!parseString || !writeToString) {
      const fastCsv = require("fast-csv");
      parseString = fastCsv.parseString;
      writeToString = fastCsv.writeToString;
    }
    return { parseString, writeToString };
  },
};

const Base = require("./base.js");

const CSV_HEADERS = {
  Comment: [
    "objectId",
    "user_id",
    "comment",
    "insertedAt",
    "ip",
    "link",
    "mail",
    "nick",
    "pid",
    "rid",
    "status",
    "ua",
    "url",
    "createdAt",
    "updatedAt",
  ],
  Counter: ["objectId", "time", "url", "createdAt", "updatedAt"],
  Users: [
    "objectId",
    "display_name",
    "email",
    "password",
    "type",
    "url",
    "avatar",
    "label",
    "github",
    "twitter",
    "facebook",
    "google",
    "weibo",
    "qq",
    "createdAt",
    "updatedAt",
  ],
};

class Github {
  constructor(repo, token) {
    this.token = token;
    this.repo = repo;
  }

  // content api can only get file < 1MB
  async get(filename) {
    const resp = await fetch(
      "https://api.github.com/repos/" +
        load.path().join(this.repo, "contents", filename),
      {
        headers: {
          accept: "application/vnd.github.v3+json",
          authorization: "token " + this.token,
          "user-agent": "Waline",
        },
      }
    )
      .then((resp) => resp.json())
      .catch((e) => {
        const isTooLarge = e.message.includes('"too_large"');

        if (!isTooLarge) {
          throw e;
        }

        return this.getLargeFile(filename);
      });

    think.logger.debug("【github】获取文件成功", { 文件名: filename });
    return {
      data: Buffer.from(resp.content, "base64").toString("utf-8"),
      sha: resp.sha,
    };
  }

  // blob api can get file larger than 1MB
  async getLargeFile(filename) {
    const { tree } = await fetch(
      "https://api.github.com/repos/" +
        load.path().join(this.repo, "git/trees/HEAD") +
        "?recursive=1",
      {
        headers: {
          accept: "application/vnd.github.v3+json",
          authorization: "token " + this.token,
          "user-agent": "Waline",
        },
      }
    ).then((resp) => resp.json());

    const file = tree.find(({ path }) => path === filename);

    if (!file) {
      const error = new Error("NOT FOUND");

      error.statusCode = 404;
      throw error;
    }

    return fetch(file.url, {
      headers: {
        accept: "application/vnd.github.v3+json",
        authorization: "token " + this.token,
        "user-agent": "Waline",
      },
    }).then((resp) => resp.json());
  }

  async set(filename, content, { sha }) {
    return fetch(
      "https://api.github.com/repos/" +
        load.path().join(this.repo, "contents", filename),
      {
        method: "PUT",
        headers: {
          accept: "application/vnd.github.v3+json",
          authorization: "token " + this.token,
          "user-agent": "Waline",
        },
        body: JSON.stringify({
          sha,
          message: "feat(waline): update comment data",
          content: Buffer.from(content, "utf-8").toString("base64"),
        }),
      }
    );
  }
}

module.exports = class extends Base {
  constructor(tableName) {
    super();
    this.tableName = tableName;

    this.git = new Github(GITHUB_REPO, GITHUB_TOKEN);
    this.basePath = GITHUB_PATH;
  }

  async collection(tableName) {
    const filename = load.path().join(this.basePath, tableName + ".csv");
    const file = await this.git.get(filename).catch((e) => {
      if (e.statusCode === 404) {
        return "";
      }
      throw e;
    });

    return new Promise((resolve, reject) => {
      const data = [];

      data.sha = file.sha;

      return load
        .fastCsv()
        .parseString(file.data, {
          headers: file ? true : CSV_HEADERS[tableName],
        })
        .on("error", reject)
        .on("data", (row) => data.push(row))
        .on("end", () => resolve(data));
    });
  }

  async save(tableName, data, sha) {
    const filename = load.path().join(this.basePath, tableName + ".csv");
    const csv = await load.fastCsv().writeToString(data, {
      headers: sha ? true : CSV_HEADERS[tableName],
      writeHeaders: true,
    });

    return this.git.set(filename, csv, { sha });
  }

  parseWhere(where) {
    const _where = [];

    if (think.isEmpty(where)) {
      return _where;
    }

    const filters = [];

    for (let k in where) {
      if (k === "_complex") {
        continue;
      }

      if (k === "objectId") {
        filters.push((item) => item.id === where[k]);
        continue;
      }
      if (think.isString(where[k])) {
        filters.push((item) => item[k] === where[k]);
        continue;
      }
      if (where[k] === undefined) {
        filters.push((item) => item[k] === null || item[k] === undefined);
      }
      if (!Array.isArray(where[k]) || !where[k][0]) {
        continue;
      }

      const handler = where[k][0].toUpperCase();

      switch (handler) {
        case "IN":
          filters.push((item) => where[k][1].includes(item[k]));
          break;
        case "NOT IN":
          filters.push((item) => !where[k][1].includes(item[k]));
          break;
        case "LIKE": {
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
          filters.push((item) => reg.test(item[k]));
          break;
        }
        case "!=":
          filters.push((item) => item[k] !== where[k][1]);
          break;
        case ">":
          filters.push((item) => item[k] >= where[k][1]);
          break;
      }
    }

    return filters;
  }

  where(data, where) {
    const filter = this.parseWhere(where);

    if (!where._complex) {
      return data.filter((item) => filter.every((fn) => fn(item)));
    }

    const logicMap = {
      and: Array.prototype.every,
      or: Array.prototype.some,
    };
    const filters = [];

    for (const k in where._complex) {
      if (k === "_logic") {
        continue;
      }

      filters.push([...filter, ...this.parseWhere({ [k]: where._complex[k] })]);
    }

    const logicFn = logicMap[where._complex._logic];

    return data.filter((item) =>
      logicFn.call(filters, (filter) => filter.every((fn) => fn(item)))
    );
  }

  async select(where, { desc, limit, offset, field } = {}) {
    const instance = await this.collection(this.tableName);
    let data = this.where(instance, where);

    if (desc) {
      data.sort((a, b) => {
        if (["insertedAt", "createdAt", "updatedAt"].includes(desc)) {
          const aTime = new Date(a[desc]).getTime();
          const bTime = new Date(b[desc]).getTime();

          return bTime - aTime;
        }

        return a[desc] - b[desc];
      });
    }

    data = data.slice(limit || 0, offset || data.length);
    if (field) {
      field.push("id");
      const fieldObj = {};

      field.forEach((f) => (fieldObj[f] = true));
      data = data.map((item) => {
        const ret = {};

        for (const k in item) {
          if (fieldObj[k]) {
            ret[k] = item[k];
          }
        }

        return ret;
      });
    }

    return data.map(({ id, ...cmt }) => ({ ...cmt, objectId: id }));
  }

  async count(where = {}, { group } = {}) {
    const instance = await this.collection(this.tableName);
    const data = this.where(instance, where);

    if (!group) {
      return data.length;
    }

    const counts = {};

    // FIXME: The loop is weird @lizheming
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < data.length; i++) {
      const key = group.map((field) => data[field]).join();

      if (!counts[key]) {
        counts[key] = { count: 0 };
        group.forEach((field) => {
          counts[key][field] = data[field];
        });
      }
      counts[key].count += 1;
    }

    return Object.keys(counts);
  }

  async add(
    data
    // { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    const instance = await this.collection(this.tableName);
    const id = Math.random().toString(36).substr(2, 15);

    instance.push({ ...data, id });
    await this.save(this.tableName, instance, instance.sha);

    return { ...data, objectId: id };
  }

  async update(data, where) {
    delete data.objectId;

    const instance = await this.collection(this.tableName);
    const list = this.where(instance, where);

    list.forEach((item) => {
      if (typeof data === "function") {
        data(item);
      } else {
        for (const k in data) {
          item[k] = data[k];
        }
      }
    });
    await this.save(this.tableName, instance, instance.sha);

    return list;
  }

  async delete(where) {
    const instance = await this.collection(this.tableName);
    const deleteData = this.where(instance, where);
    const deleteId = deleteData.map(({ id }) => id);
    const data = instance.filter((data) => !deleteId.includes(data.id));

    await this.save(this.tableName, data, instance.sha);
  }
};

think.logger.debug(" 已加载/service/storage/github.js");
