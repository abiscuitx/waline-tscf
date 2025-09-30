const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const DOMPurify = createDOMPurify(new JSDOM("").window);

/**
 * 添加钩子函数使所有链接在新窗口打开
 * 并强制设置它们的rel属性为'nofollow noreferrer noopener'
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  think.logger.debug("【xss】处理DOM节点属性");

  // 为所有具有target属性的元素设置target=_blank
  if ("target" in node && node.href && !node.href.startsWith("about:blank#")) {
    think.logger.debug("【xss】设置链接新窗口打开");
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "nofollow noreferrer noopener");
  }

  // 为非HTML/MathML链接设置xlink:show=new
  if (
    !node.hasAttribute("target") &&
    (node.hasAttribute("xlink:href") || node.hasAttribute("href"))
  ) {
    think.logger.debug("【xss】设置非HTML链接新窗口打开");
    node.setAttribute("xlink:show", "new");
  }

  // 设置预加载属性为none
  if ("preload" in node) {
    think.logger.debug("【xss】禁用预加载");
    node.setAttribute("preload", "none");
  }
});

const sanitize = (content) =>
  DOMPurify.sanitize(
    content,
    Object.assign(
      {
        FORBID_TAGS: ["form", "input", "style"], // 禁止的HTML标签
        FORBID_ATTR: ["autoplay", "style"], // 禁止的属性
      },
      think.config("domPurify") || {}
    )
  );

// 导出净化函数
module.exports = {
  sanitize,
};

think.logger.debug(" 已加载/service/markdown/xss.js");
