think.logger.debug('mathjax.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { mathjax } = require('mathjax-full/js/mathjax');
const { SVG } = require('mathjax-full/js/output/svg.js');


const { inlineTeX, blockTeX } = require('./mathCommon');
const { escapeHtml } = require('./utils');

// 设置MathJax作为渲染器
class MathToSvg {
  constructor() {
    think.logger.debug('【MathJax】初始化MathJax渲染器');
    const adaptor = liteAdaptor();

    RegisterHTMLHandler(adaptor);

    // 初始化TeX和SVG配置
    const packages = AllPackages.sort();
    const tex = new TeX({ packages });
    const svg = new SVG({ fontCache: 'none' });

    this.adaptor = adaptor;
    this.texToNode = mathjax.document('', { InputJax: tex, OutputJax: svg });

    // 处理行内公式
    this.inline = function (tex) {
      think.logger.debug('【MathJax】处理行内公式');
      const node = this.texToNode.convert(tex, { display: false });
      let svg = this.adaptor.innerHTML(node);

      // 处理渲染错误
      if (svg.includes('data-mml-node="merror"')) {
        think.logger.debug('【MathJax】行内公式渲染出错');
        const errorTitle = svg.match(/<title>(.*?)<\/title>/)[1];

        svg = `<span class='mathjax-error' title='${escapeHtml(
          errorTitle,
        )}'>${escapeHtml(tex)}</span>`;
      }

      return svg;
    };

    // 处理块级公式
    this.block = function (tex) {
      think.logger.debug('【MathJax】处理块级公式');
      const node = this.texToNode.convert(tex, { display: true });
      let svg = this.adaptor.innerHTML(node);

      // 处理渲染错误
      if (svg.includes('data-mml-node="merror"')) {
        think.logger.debug('【MathJax】块级公式渲染出错');
        const errorTitle = svg.match(/<title>(.*?)<\/title>/)[1];

        svg = `<p class='mathjax-block mathjax-error' title='${escapeHtml(
          errorTitle,
        )}'>${escapeHtml(tex)}</p>`;
      } else {
        // 设置SVG宽度为100%
        svg = svg.replace(/(width=".*?")/, 'width="100%"');
      }

      return svg;
    };
  }
}

// MathJax插件主函数
const mathjaxPlugin = (md) => {
  think.logger.debug('【MathJax】初始化MathJax插件');
  const mathToSvg = new MathToSvg();

  // 添加行内TeX语法规则
  md.inline.ruler.after('escape', 'inlineTeX', inlineTeX);

  // 添加块级TeX语法规则（这里是一个变通方案，因为类型问题）
  md.block.ruler.after('blockquote', 'blockTeX', blockTeX, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  // 设置行内TeX渲染规则
  md.renderer.rules.inlineTeX = (tokens, idx) =>
    mathToSvg.inline(tokens[idx].content);

  // 设置块级TeX渲染规则
  md.renderer.rules.blockTeX = (tokens, idx) =>
    `${mathToSvg.block(tokens[idx].content)}\n`;
};

// 导出MathJax插件
module.exports = {
  mathjaxPlugin,
};
think.logger.debug('mathjax.js');