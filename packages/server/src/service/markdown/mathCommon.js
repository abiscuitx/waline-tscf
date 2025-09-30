/*
 * 检查潜在的开闭分隔符
 * 假定在 state.src[pos] 位置有一个 "$" 符号
 */
const isValidDelim = (state, pos) => {
  // think.logger.debug('【数学公式】检查分隔符有效性');
  const prevChar = pos > 0 ? state.src.charAt(pos - 1) : "";
  const nextChar = pos + 1 <= state.posMax ? state.src.charAt(pos + 1) : "";

  return {
    canOpen: nextChar !== " " && nextChar !== "\t",
    /*
     * 检查开闭分隔符的非空白条件
     * 并检查闭合分隔符后面不是数字
     */
    canClose: !(
      prevChar === " " ||
      prevChar === "\t" ||
      /[0-9]/u.exec(nextChar)
    ),
  };
};

// 处理行内TeX公式解析
const inlineTeX = (state, silent) => {
  // think.logger.debug('【数学公式】处理行内TeX公式');
  let match;
  let pos;
  let res;
  let token;

  if (state.src[state.pos] !== "$") return false;
  res = isValidDelim(state, state.pos);

  if (!res.canOpen) {
    if (!silent) state.pending += "$";
    state.pos += 1;

    return true;
  }
  /*
   * 首先检查并跳过所有正确转义的分隔符
   * 这个循环假定第一个前导反引号不能是state.src中的第一个字符
   * 这是已知的，因为我们已经找到了一个开放分隔符
   */
  const start = state.pos + 1;

  match = start;
  while ((match = state.src.indexOf("$", match)) !== -1) {
    /*
     * 找到潜在的$，检查转义，pos将指向
     * 完成时的第一个非转义字符
     */
    pos = match - 1;
    while (state.src[pos] === "\\") pos -= 1;
    // 偶数个转义，找到潜在的闭合分隔符
    if ((match - pos) % 2 === 1) break;
    match += 1;
  }

  // 没有找到闭合分隔符，消耗$并继续
  if (match === -1) {
    // think.logger.debug('【数学公式】未找到闭合分隔符');
    if (!silent) state.pending += "$";
    state.pos = start;

    return true;
  }

  // 检查是否有空内容，即: $$，不进行解析
  if (match - start === 0) {
    // think.logger.debug('【数学公式】检测到空内容');
    if (!silent) state.pending += "$$";
    state.pos = start + 1;

    return true;
  }

  // 检查有效的闭合分隔符
  res = isValidDelim(state, match);

  if (!res.canClose) {
    if (!silent) state.pending += "$";
    state.pos = start;

    return true;
  }

  if (!silent) {
    token = state.push("inlineTeX", "math", 0);
    token.markup = "$";
    token.content = state.src.slice(start, match);
    // think.logger.debug('【数学公式】成功解析行内公式');
  }

  state.pos = match + 1;

  return true;
};

// 处理块级TeX公式解析
const blockTeX = (state, start, end, silent) => {
  // think.logger.debug('【数学公式】处理块级TeX公式');
  let firstLine;
  let lastLine;
  let next;
  let lastPos;
  let found = false;
  let pos = state.bMarks[start] + state.tShift[start];
  let max = state.eMarks[start];

  if (pos + 2 > max) return false;
  if (state.src.slice(pos, pos + 2) !== "$$") return false;
  pos += 2;

  firstLine = state.src.slice(pos, max);

  if (silent) return true;

  if (firstLine.trim().endsWith("$$")) {
    // 单行表达式
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }

  for (next = start; !found; ) {
    next += 1;
    if (next >= end) break;
    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];
    if (pos < max && state.tShift[next] < state.blkIndent)
      // 带有负缩进的非空行应该停止列表
      break;
    if (state.src.slice(pos, max).trim().endsWith("$$")) {
      lastPos = state.src.slice(0, max).lastIndexOf("$$");
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push("blockTeX", "math", 0);

  token.block = true;
  token.content =
    ((firstLine === null || firstLine === void 0 ? void 0 : firstLine.trim())
      ? `${firstLine}\n`
      : "") +
    state.getLines(start + 1, next, state.tShift[start], true) +
    ((lastLine === null || lastLine === void 0 ? void 0 : lastLine.trim())
      ? lastLine
      : "");
  token.map = [start, state.line];
  token.markup = "$$";

  // think.logger.debug('【数学公式】成功解析块级公式');
  return true;
};

// 导出TeX解析函数
module.exports = {
  inlineTeX,
  blockTeX,
};

think.logger.debug(" 已加载/service/markdown/mathCommon.js");
