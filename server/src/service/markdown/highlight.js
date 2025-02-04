think.logger.debug('highlight.js');
const prism = require('prismjs');
const rawLoadLanguages = require('prismjs/components/index');


// 禁用警告信息
rawLoadLanguages.silent = true;

// 加载指定的语言支持
const loadLanguages = (languages = []) => {
  think.logger.debug('【高亮】准备加载语言支持:', languages);
  // 过滤出尚未加载的语言
  const langsToLoad = languages.filter((item) => !prism.languages[item]);

  // 如果有需要加载的语言，则进行加载
  if (langsToLoad.length) {
    think.logger.debug('【高亮】加载新的语言支持:', langsToLoad);
    rawLoadLanguages(langsToLoad);
  }
};

// 解析对应语言的语法高亮器
const resolveHighlighter = (language) => {
  think.logger.debug('【高亮】解析语言高亮器:', language);
  
  // 尝试加载语言支持
  loadLanguages([language]);

  // 如果当前语言无法加载，返回null
  if (!prism.languages[language]) {
    think.logger.debug('【高亮】语言支持加载失败:', language);
    return null;
  }

  think.logger.debug('【高亮】语言高亮器解析成功:', language);
  // 返回高亮处理函数
  return (code) => prism.highlight(code, prism.languages[language], language);
};

// 导出高亮相关方法
module.exports = {
  resolveHighlighter,
};
think.logger.debug('highlight.js');