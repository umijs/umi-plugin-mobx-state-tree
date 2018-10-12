"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.chunkName = chunkName;
exports.optsToArray = optsToArray;
exports.endWithSlash = endWithSlash;
exports.findJSFile = findJSFile;

var _slash = _interopRequireDefault(require("slash2"));

var _path = require("path");

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const JS_EXTNAMES = ['.js', '.jsx', '.ts', '.tsx'];

function stripFirstSlash(path) {
  if (path.charAt(0) === '/') {
    return path.slice(1);
  } else {
    return path;
  }
}

function chunkName(cwd, path) {
  return stripFirstSlash((0, _slash.default)(path).replace((0, _slash.default)(cwd), '')).replace(/\//g, '__').replace(/^src__/, '').replace(/^pages__/, 'p__').replace(/^page__/, 'p__');
}

function optsToArray(item) {
  if (!item) return [];

  if (Array.isArray(item)) {
    return item;
  } else {
    return [item];
  }
}

function endWithSlash(path) {
  return path.slice(-1) !== '/' ? `${path}/` : path;
}

function findJSFile(baseDir, fileNameWithoutExtname) {
  for (var _i = 0; _i < JS_EXTNAMES.length; _i++) {
    const extname = JS_EXTNAMES[_i];
    const fileName = `${fileNameWithoutExtname}${extname}`;
    const absFilePath = (0, _path.join)(baseDir, fileName);

    if ((0, _fs.existsSync)(absFilePath)) {
      return absFilePath;
    }
  }
}