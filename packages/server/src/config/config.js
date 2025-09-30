// 从环境变量获取配置参数
const {
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
  SECURE_DOMAINS,
  DISABLE_USERAGENT,
  DISABLE_REGION,
  AVATAR_PROXY,
  GITHUB_TOKEN,
  DETA_PROJECT_KEY,
  OAUTH_URL,
  MARKDOWN_CONFIG = "{}",
  MARKDOWN_HIGHLIGHT,
  MARKDOWN_EMOJI,
  MARKDOWN_SUB,
  MARKDOWN_SUP,
  MARKDOWN_TEX = "mathjax",
  MARKDOWN_MATHJAX = "{}",
  MARKDOWN_KATEX = "{}",
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

// 初始化数据库类型和JWT密钥
let storage = "leancloud";
let jwtKey = JWT_TOKEN || LEAN_KEY;

// 判断使用的数据库类型
if (LEAN_KEY) {
  storage = "leancloud";
} else if (MONGO_DB) {
  storage = "mongodb";
  jwtKey = jwtKey || MONGO_PASSWORD;
} else if (PG_DB || POSTGRES_DATABASE) {
  storage = "postgresql";
  jwtKey = jwtKey || PG_PASSWORD || POSTGRES_PASSWORD;
} else if (MYSQL_DB) {
  storage = "mysql";
  jwtKey = jwtKey || MYSQL_PASSWORD;
} else if (TIDB_DB) {
  storage = "tidb";
  jwtKey = jwtKey || TIDB_PASSWORD;
} else if (GITHUB_TOKEN) {
  storage = "github";
  jwtKey = jwtKey || GITHUB_TOKEN;
} else if (DETA_PROJECT_KEY) {
  storage = "deta";
  jwtKey = jwtKey || DETA_PROJECT_KEY;
}

// 处理禁用词配置
const forbiddenWords = FORBIDDEN_WORDS ? FORBIDDEN_WORDS.split(/\s*,\s*/) : [];

// Markdown配置项
const isFalse = (content) =>
  content && ["0", "false"].includes(content.toLowerCase());
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

// 头像代理配置
let avatarProxy = "";

if (AVATAR_PROXY) {
  avatarProxy = !isFalse(AVATAR_PROXY) ? AVATAR_PROXY : "";
}

// OAuth配置
const oauthUrl = OAUTH_URL || "https://oauth.lithub.cc";

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

console.log(new Date(), " 已加载config/config.js");
