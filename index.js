
const codeBlocks = require('gfm-code-blocks');
const merge = require('lodash/merge');
const cryptoRandomString = require('crypto-random-string');

const PLUGIN_CONST = require('./lib/constants');
const renderers = require('./lib/renderers');
const utils = require('./lib/utils');

const defaultOpts = {
  renderer: 'bootstrap3',
};

const getLine = (state, line) => {
  const pos = state.bMarks[line] + state.blkIndent;
  const max = state.eMarks[line];

  return state.src.substr(pos, max - pos);
};

const createGroup = () => {
  return (state, startLine, endLine) => {
    if (getLine(state, startLine) === `[${PLUGIN_CONST.tokenName}]`) {
      const startPgn = startLine + 1;
      let nextLine = startPgn;
      while (nextLine < endLine) {
        if (getLine(state, nextLine) === `[/${PLUGIN_CONST.tokenName}]`) {
          state.tokens.push({
            type: PLUGIN_CONST.tokenName,
            content: state.getLines(startPgn, nextLine, state.blkIndent, true),
            block: true,
            lines: [startLine, nextLine],
            level: state.level,
          });
          state.line = nextLine + 1;
          return true;
        }
        nextLine++;
      }
    }
    return false;
  };
};

const renderCodeGroup = (md, options, content, block) => {
  const parsedCodeBlocks = codeBlocks(content);
  parsedCodeBlocks.forEach((item, i) => {
    const descriptor = item.lang;
    item.tabId = `${descriptor.replace(PLUGIN_CONST.langSeperator, '-')}-${cryptoRandomString(10)}-${i}`;
    item.tabName = utils.getTabName(descriptor);
    item.langName = utils.getLangName(descriptor);
    item.sanitizedBlock = item.block.replace(descriptor, item.langName);
    item.render = md.render(item.sanitizedBlock);
  });
  return renderers[options.renderer](md, options, parsedCodeBlocks, content, block);
};

const getOpts = (options) => {
  const builtOpts = merge({}, defaultOpts, options);
  if (!renderers[builtOpts.renderer]) {
    builtOpts.renderer = defaultOpts.renderer;
  }
  return builtOpts;
};

module.exports = (md, options) => {
  const builtOpts = getOpts(options);
  md.block.ruler.before('code', PLUGIN_CONST.tokenName, createGroup(md), { alt: [] });
  md.renderer.rules.codegroup = function codegroupRender(tokens, idx) {
    return renderCodeGroup(md, builtOpts, tokens[idx].content, tokens[idx].block);
  };
};
