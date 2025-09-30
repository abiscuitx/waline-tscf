let MarkdownIt, katexPlugin, subPlugin, supPlugin, emojiPlugin;

const load = {
  markdownIt: () => MarkdownIt || (MarkdownIt = require("markdown-it")),
  katex: () =>
    katexPlugin || (katexPlugin = require("@mdit/plugin-katex").katex),
  sub: () => subPlugin || (subPlugin = require("@mdit/plugin-sub").sub),
  sup: () => supPlugin || (supPlugin = require("@mdit/plugin-sup").sup),
  emoji: () => emojiPlugin || (emojiPlugin = require("markdown-it-emoji")),
  highlight: () => require("./highlight.js"),
  mathjax: () => require("./mathjax.js"),
  xss: () => require("./xss.js"),
};

// 使用懒加载
let markdownParser = null;

function getMarkdownParser() {
  if (!markdownParser) {
    // 仅在需要时初始化
    markdownParser = initMarkdownParser();
  }

  return markdownParser;
}

// 获取Markdown解析器实例
const initMarkdownParser = () => {
  think.logger.debug("【Markdown】初始化Markdown解析器");
  const { markdown = {} } = think.config();
  const { config = {}, plugin = {} } = markdown;

  // 创建markdown-it实例
  const markdownIt = load.markdownIt()({
    breaks: true,
    linkify: true,
    typographer: true,
    highlight: (code, lang) => {
      const highlighter = load.highlight().resolveHighlighter(lang);

      return highlighter ? highlighter(code) : "";
    },
    ...config,
    html: true,
  });

  // 获取插件配置
  const { emoji, tex, mathjax, katex, sub, sup } = plugin;

  // 解析emoji表情
  if (emoji !== false) {
    markdownIt.use(load.emoji().full, typeof emoji === "object" ? emoji : {});
  }

  // 解析下标
  if (sub !== false) {
    markdownIt.use(load.sub());
  }

  // 解析上标
  if (sup !== false) {
    markdownIt.use(load.sup());
  }

  // 解析数学公式
  if (tex === "katex") {
    markdownIt.use(load.katex(), {
      ...katex,
      output: "mathml",
    });
  } else if (tex !== false) {
    markdownIt.use(load.mathjax().mathjaxPlugin, mathjax);
  }

  return (content) => load.xss().sanitize(markdownIt.render(content));
};

module.exports = { getMarkdownParser };

think.logger.debug(" 已加载/service/markdown/index.js");
