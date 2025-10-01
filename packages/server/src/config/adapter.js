// 懒加载
let Mysql, Mysql2, Postgresql, Basic;
const load = {
  mysql: () => Mysql || (Mysql = require('think-model-mysql')),
  mysql2: () => Mysql2 || (Mysql2 = require('think-model-mysql2')),
  postgresql: () =>
    Postgresql || (Postgresql = require('think-model-postgresql')),
  basic: () => Basic || (Basic = require('think-logger3').Basic),
};

const {
  MONGO_AUTHSOURCE,
  MONGO_DB,
  MONGO_HOST,
  MONGO_PASSWORD,
  MONGO_PORT,
  MONGO_REPLICASET,
  MONGO_USER,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DB,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_PREFIX,
  MYSQL_CHARSET,
  MYSQL_SSL,
  TIDB_HOST,
  TIDB_PORT,
  TIDB_DB,
  TIDB_USER,
  TIDB_PASSWORD,
  TIDB_PREFIX,
  TIDB_CHARSET,
  PG_DB,
  POSTGRES_DATABASE,
  PG_HOST,
  POSTGRES_HOST,
  PG_PASSWORD,
  POSTGRES_PASSWORD,
  PG_PORT,
  POSTGRES_PORT,
  PG_PREFIX,
  POSTGRES_PREFIX,
  PG_USER,
  POSTGRES_USER,
  PG_SSL,
  POSTGRES_SSL,
  LOG_LEVEL,
} = process.env;

// 初始化数据库类型和MongoDB选项
let type = 'common';
const mongoOpt = {
  connectTimeoutMS: 3000, // 连接超时时间
  socketTimeoutMS: 3000, // Socket 超时时间
  serverSelectionTimeoutMS: 3000, // 服务器选择超时时间
  maxPoolSize: 3, // 减小连接池大小，适应内存限制
  minPoolSize: 1, // 最小保持一个连接
  keepAlive: true, // 保持连接活跃
  keepAliveInitialDelay: 60000, // 5分钟后开始保活
  retryWrites: true, // 启用重试写入
  w: 'majority', // 写入确认级别
  wtimeoutMS: 4000, // 降低写入超时
  maxIdleTimeMS: 30000, // 关闭空闲连接
};

// 根据环境变量判断数据库类型
if (MONGO_DB) {
  type = 'mongo';
  if (MONGO_REPLICASET) mongoOpt.replicaSet = MONGO_REPLICASET;
  if (MONGO_AUTHSOURCE) mongoOpt.authSource = MONGO_AUTHSOURCE;
  for (const envKeys in process.env) {
    if (/MONGO_OPT_/.test(envKeys)) {
      const key = envKeys
        .slice(10)
        .toLocaleLowerCase()
        .replace(/_([a-z])/g, (_, b) => b.toUpperCase());

      mongoOpt[key] = process.env[envKeys];
    }
  }
} else if (PG_DB || POSTGRES_DATABASE) {
  type = 'postgresql';
} else if (MYSQL_DB) {
  type = 'mysql';
} else if (TIDB_DB) {
  type = 'tidb';
} else {
  console.warn('【适配器】未检测到数据库配置');
}

// 根据数据库类型获取对应的 handle
const getHandle = (dbType) => {
  switch (dbType) {
    case 'mysql':
      return () => load.mysql();
    case 'tidb':
      return () => load.mysql2();
    case 'postgresql':
      return () => load.postgresql();
    default:
      return null;
  }
};

// 导出数据库配置对象
exports.model = {
  type,

  common: {
    logSql: true,
    logger: (msg) => think.logger.info(msg),
  },

  mongo: {
    host: MONGO_HOST
      ? MONGO_HOST.startsWith('[')
        ? JSON.parse(MONGO_HOST)
        : MONGO_HOST
      : '127.0.0.1',
    port: MONGO_PORT
      ? MONGO_PORT.startsWith('[')
        ? JSON.parse(MONGO_PORT)
        : MONGO_PORT
      : 27017,
    user: MONGO_USER,
    password: MONGO_PASSWORD,
    database: MONGO_DB,
    options: mongoOpt,
  },
  mysql: {
    handle: getHandle(type),
    dateStrings: true,
    host: MYSQL_HOST || '127.0.0.1',
    port: MYSQL_PORT || '3306',
    database: MYSQL_DB,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    prefix: MYSQL_PREFIX || 'wl_',
    charset: MYSQL_CHARSET || 'utf8mb4',
    ssl:
      MYSQL_SSL === 'true'
        ? {
            rejectUnauthorized: false,
          }
        : null,
  },
  tidb: {
    handle: getHandle(type),
    dateStrings: true,
    host: TIDB_HOST || '127.0.0.1',
    port: TIDB_PORT || '4000',
    database: TIDB_DB,
    user: TIDB_USER,
    password: TIDB_PASSWORD,
    prefix: TIDB_PREFIX || 'wl_',
    charset: TIDB_CHARSET || 'utf8mb4',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  },
  postgresql: {
    handle: getHandle(type),
    user: PG_USER || POSTGRES_USER,
    password: PG_PASSWORD || POSTGRES_PASSWORD,
    database: PG_DB || POSTGRES_DATABASE,
    host: PG_HOST || POSTGRES_HOST || '127.0.0.1',
    port: PG_PORT || POSTGRES_PORT,
    connectionLimit: 1,
    prefix: PG_PREFIX || POSTGRES_PREFIX || 'wl_',
    ssl:
      (PG_SSL || POSTGRES_SSL) == 'true'
        ? {
            rejectUnauthorized: false,
          }
        : null,
  },
};

// 导出日志配置对象
exports.logger = {
  type: 'advanced',
  advanced: {
    handle: load.basic(),
    appenders: {
      everything: {
        type: 'console',
      },
      Filter: {
        type: 'logLevelFilter',
        appender: 'everything',
        level: 'debug', // 日志级别：debug、info、warn、error
      },
    },

    categories: {
      default: {
        appenders: ['Filter'],
        level: LOG_LEVEL || 'error', // 默认日志级别：info
      },
    },
  },
};

console.log(new Date(), ' 已加载config/adapter.js', '数据库:', type);
