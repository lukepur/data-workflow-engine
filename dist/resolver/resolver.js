'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var traverse = require('traverse');

var _require = require('lodash'),
    get = _require.get,
    transform = _require.transform,
    isEqual = _require.isEqual;

var _require2 = require('../util/path-utils'),
    getDataPathsForRefPath = _require2.getDataPathsForRefPath;

var nameProp = 'fn';
var argsProp = 'args';

function collectArrayValues(pathStr, data) {
  var results = [];
  var dataPaths = getDataPathsForRefPath(pathStr, data);
  dataPaths.forEach(function (path) {
    results.push(get(data, path));
  });
  return results;
}

function applyRelativeIndexes() {
  var pathStr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var targetPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var pathArr = pathStr.split('.');
  return pathArr.map(function (token, index) {
    if (token === '^') {
      return targetPath[index];
    }
    return token;
  }).join('.');
}

function resolveString(string, data) {
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var targetPath = arguments[3];

  if (string === '$value') {
    if (targetPath) {
      return get(data, targetPath);
    }
    console.warn('$value specified, but no targetPath defined');
  }
  if (string.indexOf('$.') === 0) {
    var pathStr = string;
    if (pathStr.indexOf('^') !== -1) {
      pathStr = '$.' + applyRelativeIndexes(pathStr.replace('$.', ''), targetPath);
    }
    if (pathStr.indexOf('*') !== -1) {
      return collectArrayValues(pathStr, data);
    }
    return get(data, pathStr.replace('$.', ''));
  }
  return string;
}

module.exports = function resolve(resolvable, data, context, targetPath) {
  if (typeof context[resolvable[nameProp]] === 'function') {
    var args = Array.isArray(resolvable[argsProp]) ? resolvable[argsProp] : [];
    // console.log('applying:', resolvable[nameProp], 'with:', args.map(arg => resolve(arg, data, context, targetPath)));
    return context[resolvable[nameProp]].apply(null, args.map(function (arg) {
      return resolve(arg, data, context, targetPath);
    }));
  }
  if (typeof resolvable === 'string') {
    return resolveString(resolvable, data, context, targetPath);
  }
  if (Array.isArray(resolvable)) {
    return resolvable.map(function (item) {
      return resolve(item, data, context, targetPath);
    });
  }
  if ((typeof resolvable === 'undefined' ? 'undefined' : _typeof(resolvable)) === 'object') {
    return transform(resolvable, function (memo, value, prop) {
      memo[prop] = resolve(value, data, context, targetPath);
      return memo;
    }, {});
  }
  return resolvable;
};