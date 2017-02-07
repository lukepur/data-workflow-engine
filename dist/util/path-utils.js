'use strict';

var traverse = require('traverse');

function matches() {
  var refPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var dataPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  return refPath.length === dataPath.length && refPath.reduce(function (memo, token, index) {
    var dataPathToken = dataPath[index];
    return memo && (dataPathToken === token || token === '*' && dataPathToken.match(/\d/));
  }, true);
}

module.exports.getDataPathsForRefPath = function getDataPathsForRefPath(path, data) {
  var paths = [];
  var refPathArr = path.replace('$.', '').split('.');
  traverse(data).forEach(function (node) {
    if (matches(refPathArr, this.path)) {
      paths.push(this.path);
    }
  });
  return paths;
};

module.exports.getRefPathForDataPath = function getRefPathForDataPath() {
  var dataPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  return dataPath.reduce(function (memo, prop) {
    return memo + '.' + (!isNaN(prop) ? '*' : prop);
  }, '$').replace(/\.\*$/, ''); // remove trailing '.*'
};