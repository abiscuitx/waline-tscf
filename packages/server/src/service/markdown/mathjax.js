let liteAdaptor, RegisterHTMLHandler, AllPackages, TeX, mathjax, SVG;

const load = {
  adaptor: () =>
    liteAdaptor ||
    (liteAdaptor =
      require("mathjax-full/js/adaptors/liteAdaptor.js").liteAdaptor),
  handler: () =>
    RegisterHTMLHandler ||
    (RegisterHTMLHandler =
      require("mathjax-full/js/handlers/html.js").RegisterHTMLHandler),
  packages: () =>
    AllPackages ||
    (AllPackages =
      require("mathjax-full/js/input/tex/AllPackages.js").AllPackages),
  tex: () => TeX || (TeX = require("mathjax-full/js/input/tex.js").TeX),
  mathjax: () =>
    mathjax || (mathjax = require("mathjax-full/js/mathjax").mathjax),
  svg: () => SVG || (SVG = require("mathjax-full/js/output/svg.js").SVG),
  mathCommon: () => require("./mathCommon"),
  utils: () => require("./utils"),
};

// 设置MathJax作为渲染器
class MathToSvg {
  constructor() {
    const adaptor = load.adaptor()();

    load.handler()(adaptor);

    // 初始化TeX和SVG配置
    const packages = load.packages().sort();
    const tex = new (load.tex())({ packages });
    const svg = new (load.svg())({ fontCache: "none" });

    this.adaptor = adaptor;
    this.texToNode = load
      .mathjax()
      .document("", { InputJax: tex, OutputJax: svg });

    // 处理行内公式
    this.inline = function (tex) {
      think.logger.debug("【mathjax】处理行内公式");
      const node = this.texToNode.convert(tex, { display: false });
      let svg = this.adaptor.innerHTML(node);

      // 处理渲染错误
      if (svg.includes('data-mml-node="merror"')) {
        think.logger.warn("【mathjax】行内公式渲染出错");
        const errorTitle = svg.match(/<title>(.*?)<\/title>/)[1];

        svg = `<span class='mathjax-error' title='${load
          .utils()
          .escapeHtml(errorTitle)}'>${load.utils().escapeHtml(tex)}</span>`;
      }

      return svg;
    };

    // 处理块级公式
    this.block = function (tex) {
      think.logger.debug("【mathjax】处理块级公式");
      const node = this.texToNode.convert(tex, { display: true });
      let svg = this.adaptor.innerHTML(node);

      // 处理渲染错误
      if (svg.includes('data-mml-node="merror"')) {
        think.logger.warn("【mathjax】块级公式渲染出错");
        const errorTitle = svg.match(/<title>(.*?)<\/title>/)[1];

        svg = `<p class='mathjax-block mathjax-error' title='${load
          .utils()
          .escapeHtml(errorTitle)}'>${load.utils().escapeHtml(tex)}</p>`;
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
  think.logger.debug("【mathjax】初始化MathJax插件");
  const mathToSvg = new MathToSvg();
  const { inlineTeX, blockTeX } = load.mathCommon();

  // 添加行内TeX语法规则
  md.inline.ruler.after("escape", "inlineTeX", inlineTeX);

  // 添加块级TeX语法规则（这里是一个变通方案，因为类型问题）
  md.block.ruler.after("blockquote", "blockTeX", blockTeX, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  // 设置行内TeX渲染规则
  md.renderer.rules.inlineTeX = (tokens, idx) =>
    mathToSvg.inline(tokens[idx].content);

  // 设置块级TeX渲染规则
  md.renderer.rules.blockTeX = (tokens, idx) =>
    `${mathToSvg.block(tokens[idx].content)}\n`;
};

module.exports = { mathjaxPlugin };

think.logger.debug(" 已加载/service/markdown/mathjax.js");
