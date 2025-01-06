
console.log('【配置】 初始化配置');
// 从环境变量获取配置参数
const {
  // JWT和存储相关配置
  JWT_TOKEN,
  LEAN_KEY,
  MYSQL_DB,
  MYSQL_PASSWORD,
  TIDB_DB,
  TIDB_PASSWORD,
  PG_DB,
  POSTGRES_DATABASE,
  PG_PASSWORD,
  POSTGRES_PASSWORD,
  MONGO_DB,
  MONGO_PASSWORD,
  FORBIDDEN_WORDS,
  TCB_ENV,
  TENCENTCLOUD_SECRETKEY,
  TCB_KEY,
  SECURE_DOMAINS,
  DISABLE_USERAGENT,
  DISABLE_REGION,
  AVATAR_PROXY,
  GITHUB_TOKEN,
  DETA_PROJECT_KEY,
  OAUTH_URL,

  MARKDOWN_CONFIG = '{}',
  MARKDOWN_HIGHLIGHT,
  MARKDOWN_EMOJI,
  MARKDOWN_SUB,
  MARKDOWN_SUP,
  // mathjax will be the default option for tex
  MARKDOWN_TEX = 'mathjax',
  MARKDOWN_MATHJAX = '{}',
  MARKDOWN_KATEX = '{}',

  MAIL_SUBJECT,
  MAIL_TEMPLATE,
  MAIL_SUBJECT_ADMIN,
  MAIL_TEMPLATE_ADMIN,
  QQ_TEMPLATE,
  TG_TEMPLATE,
  WX_TEMPLATE,
  SC_TEMPLATE,
  DISCORD_TEMPLATE,
  LARK_TEMPLATE,

  LEVELS,
  COMMENT_AUDIT,
} = process.env;

// 初始化存储类型和JWT密钥
let storage = 'leancloud';
let jwtKey = JWT_TOKEN || LEAN_KEY;

console.log('[Waline] 开始初始化存储配置...');

// 判断使用的存储类型
if (LEAN_KEY) {
  storage = 'leancloud';
  console.log('[Waline] 使用 LeanCloud 存储服务');
} else if (MONGO_DB) {
  storage = 'mongodb';
  console.log('[Waline] 使用 MongoDB 存储服务');
  jwtKey = jwtKey || MONGO_PASSWORD;
} else if (PG_DB || POSTGRES_DATABASE) {
  storage = 'postgresql';
  console.log('[Waline] 使用 PostgreSQL 存储服务');
  jwtKey = jwtKey || PG_PASSWORD || POSTGRES_PASSWORD;
} else if (MYSQL_DB) {
  storage = 'mysql';
  console.log('[Waline] 使用 MySQL 存储服务');
  jwtKey = jwtKey || MYSQL_PASSWORD;
} else if (TIDB_DB) {
  storage = 'tidb';
  console.log('[Waline] 使用 TiDB 存储服务');
  jwtKey = jwtKey || TIDB_PASSWORD;
} else if (GITHUB_TOKEN) {
  storage = 'github';
  console.log('[Waline] 使用 GitHub 存储服务');
  jwtKey = jwtKey || GITHUB_TOKEN;
} else if (think.env === 'cloudbase' || TCB_ENV) {
  storage = 'cloudbase';
  console.log('[Waline] 使用腾讯云开发存储服务');
  jwtKey = jwtKey || TENCENTCLOUD_SECRETKEY || TCB_KEY || TCB_ENV;
} else if (DETA_PROJECT_KEY) {
  storage = 'deta';
  console.log('[Waline] 使用 Deta 存储服务');
  jwtKey = jwtKey || DETA_PROJECT_KEY;
}

console.log('[Waline] 配置加载完成');

// 处理禁用词配置
const forbiddenWords = FORBIDDEN_WORDS ? FORBIDDEN_WORDS.split(/\s*,\s*/) : [];
console.log('[Waline] 禁用词配置加载完成');

// 判断配置值是否为false的辅助函数
const isFalse = (content) =>
  content && ['0', 'false'].includes(content.toLowerCase());
console.log('[Waline] 配置值是否为false辅助函数加载完成');


// Markdown配置项
const markdown = {
  config: JSON.parse(MARKDOWN_CONFIG),
  plugin: {
    emoji: !isFalse(MARKDOWN_EMOJI),
    sub: !isFalse(MARKDOWN_SUB),
    sup: !isFalse(MARKDOWN_SUP),
    tex: isFalse(MARKDOWN_TEX) ? false : MARKDOWN_TEX,
    mathjax: JSON.parse(MARKDOWN_MATHJAX),
    katex: JSON.parse(MARKDOWN_KATEX),
  },
};

if (isFalse(MARKDOWN_HIGHLIGHT)) markdown.config.highlight = false;
console.log('[Waline] markdown配置加载完成');

// 头像代理配置
let avatarProxy = '';
if (AVATAR_PROXY) {
  avatarProxy = !isFalse(AVATAR_PROXY) ? AVATAR_PROXY : '';
}

// OAuth配置
const oauthUrl = OAUTH_URL || 'https://oauth.lithub.cc';


// 导出配置对象
module.exports = {
  workers: 1,
  storage,
  jwtKey,
  forbiddenWords,
  disallowIPList: [],
  secureDomains: SECURE_DOMAINS ? SECURE_DOMAINS.split(/\s*,\s*/) : undefined,
  disableUserAgent: DISABLE_USERAGENT && !isFalse(DISABLE_USERAGENT),
  disableRegion: DISABLE_REGION && !isFalse(DISABLE_REGION),
  levels:
    !LEVELS || isFalse(LEVELS)
      ? false
      : LEVELS.split(/\s*,\s*/).map((v) => Number(v)),
  audit: COMMENT_AUDIT && !isFalse(COMMENT_AUDIT),
  avatarProxy,
  oauthUrl,
  markdown,
  mailSubject: MAIL_SUBJECT,
  mailTemplate: MAIL_TEMPLATE,
  mailSubjectAdmin: MAIL_SUBJECT_ADMIN,
  mailTemplateAdmin: MAIL_TEMPLATE_ADMIN,
  QQTemplate: QQ_TEMPLATE,
  TGTemplate: TG_TEMPLATE,
  WXTemplate: WX_TEMPLATE,
  SCTemplate: SC_TEMPLATE,
  DiscordTemplate: DISCORD_TEMPLATE,
  LarkTemplate: LARK_TEMPLATE,
};

console.log('【配置】 已加载配置');
