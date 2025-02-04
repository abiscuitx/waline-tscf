think.logger.debug('katex.js');
const katex = require('katex');
const { inlineTeX, blockTeX } = require('./mathCommon.js');
const { escapeHtml } = require('./utils.js');

// 为markdown-it-simplemath设置KaTeX作为渲染器
// 处理行内数学公式
const katexInline = (tex, options) => {
  think.logger.debug('【KaTeX】处理行内数学公式');
  options.displayMode = false;
  try {
    return katex.renderToString(tex, options);
  } catch (error) {
    if (options.throwOnError) {
      think.logger.debug('【KaTeX】行内公式渲染错误:', error);
      console.warn(error);
    }

    // 渲染错误时显示错误提示
    return `<span class='katex-error' title='${escapeHtml(
      error.toString(),
    )}'>${escapeHtml(tex)}</span>`;
  }
};

// 处理块级数学公式
const katexBlock = (tex, options) => {
  think.logger.debug('【KaTeX】处理块级数学公式');
  options.displayMode = true;
  try {
    return `<p class='katex-block'>${katex.renderToString(tex, options)}</p>`;
  } catch (error) {
    if (options.throwOnError) {
      think.logger.debug('【KaTeX】块级公式渲染错误:', error);
      console.warn(error);
    }

    // 渲染错误时显示错误提示
    return `<p class='katex-block katex-error' title='${escapeHtml(
      error.toString(),
    )}'>${escapeHtml(tex)}</p>`;
  }
};

// KaTeX插件主函数
const katexPlugin = (md, options = { throwOnError: false }) => {
  think.logger.debug('【KaTeX】初始化KaTeX插件');
  // 添加行内TeX语法规则
  md.inline.ruler.after('escape', 'inlineTeX', inlineTeX);

  // 添加块级TeX语法规则（这里是一个变通方案，因为类型问题）
  md.block.ruler.after('blockquote', 'blockTeX', blockTeX, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  // 设置行内TeX渲染规则
  md.renderer.rules.inlineTeX = (tokens, idx) =>
    katexInline(tokens[idx].content, options);

  // 设置块级TeX渲染规则
  md.renderer.rules.blockTeX = (tokens, idx) =>
    `${katexBlock(tokens[idx].content, options)}\n`;
};

// 导出KaTeX插件
module.exports = {
  katexPlugin,
};
think.logger.debug('katex.js');