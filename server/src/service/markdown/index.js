// 引入Markdown相关插件
const { katex: katexPlugin } = require('@mdit/plugin-katex');
const { sub: subPlugin } = require('@mdit/plugin-sub');
const { sup: supPlugin } = require('@mdit/plugin-sup');
const MarkdownIt = require('markdown-it');
const emojiPlugin = require('markdown-it-emoji');


// 引入自定义插件和工具
const { resolveHighlighter } = require('./highlight.js');
const { mathjaxPlugin } = require('./mathjax.js');
const { sanitize } = require('./xss.js');

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
  think.logger.debug('【Markdown】初始化Markdown解析器');
  // 获取Markdown配置
  const { markdown = {} } = think.config();
  const { config = {}, plugin = {} } = markdown;

  // 创建markdown-it实例
  const markdownIt = MarkdownIt({
    breaks: true,                // 转换换行符为 <br>
    linkify: true,              // 自动将URL文本转换为链接
    typographer: true,          // 启用一些语言中性的替换和引号美化

    // 默认代码高亮处理
    highlight: (code, lang) => {
      think.logger.debug('【Markdown】处理代码高亮，语言:', lang);
      const highlighter = resolveHighlighter(lang);

      return highlighter ? highlighter(code) : '';
    },

    ...config,

    // 由于解析emoji需要，必须启用html选项
    html: true,
  });

  // 获取插件配置
  const { emoji, tex, mathjax, katex, sub, sup } = plugin;

  // 解析emoji表情
  if (emoji !== false) {
    think.logger.debug('【Markdown】启用emoji解析插件');
    markdownIt.use(emojiPlugin.full, typeof emoji === 'object' ? emoji : {});
  }

  // 解析下标
  if (sub !== false) {
    think.logger.debug('【Markdown】启用下标解析插件');
    markdownIt.use(subPlugin);
  }

  // 解析上标
  if (sup !== false) {
    think.logger.debug('【Markdown】启用上标解析插件');
    markdownIt.use(supPlugin);
  }

  // 解析数学公式
  if (tex === 'katex') {
    think.logger.debug('【Markdown】启用KaTeX数学公式解析插件');
    markdownIt.use(katexPlugin, {
      ...katex,
      output: 'mathml',
    });
  } else if (tex !== false) {
    think.logger.debug('【Markdown】启用MathJax数学公式解析插件');
    markdownIt.use(mathjaxPlugin, mathjax);
  }

  // 返回解析函数
  return (content) => {
    // think.logger.debug('【Markdown】开始解析Markdown内容');
    return sanitize(markdownIt.render(content));
  };
};

// 导出Markdown解析器
module.exports = { getMarkdownParser };
