let prism, rawLoadLanguages;

const load = {
  prism: () => prism || (prism = require("prismjs")),
  languages: () => {
    if (!rawLoadLanguages) {
      rawLoadLanguages = require("prismjs/components/index");
      // 禁用警告信息
      rawLoadLanguages.silent = true;
    }

    return rawLoadLanguages;
  },
};

// 加载指定的语言支持
const loadLanguages = (languages = []) => {
  const prismInstance = load.prism();
  // 过滤出尚未加载的语言
  const langsToLoad = languages.filter(
    (item) => !prismInstance.languages[item]
  );

  // 如果有需要加载的语言，则进行加载
  if (langsToLoad.length) {
    load.languages()(langsToLoad);
  }
};

// 解析对应语言的语法高亮器
const resolveHighlighter = (language) => {
  // 尝试加载语言支持
  loadLanguages([language]);
  const prismInstance = load.prism();

  // 如果当前语言无法加载，返回null
  if (!prismInstance.languages[language]) {
    return null;
  }

  // 返回高亮处理函数
  return (code) =>
    prismInstance.highlight(code, prismInstance.languages[language], language);
};

// 导出高亮相关方法
module.exports = {
  resolveHighlighter,
};

think.logger.debug(" 已加载/service/markdown/highlight.js");
