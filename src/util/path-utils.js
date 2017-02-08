const traverse = require('traverse');
const { dropRight } = require('lodash');

function matches(refPath = [], dataPath = []) {
  return refPath.length === dataPath.length && refPath.reduce((memo, token, index) => {
    const dataPathToken = dataPath[index];
    return memo && (dataPathToken === token || (token === '*' && dataPathToken.match(/\d/)));
  }, true);
}

module.exports.getDataPathsForRefPath = function getDataPathsForRefPath(path, data) {
  const paths = [];
  const refPathArr = path.replace('$.', '').split('.');
  traverse(data).forEach(function (node) {
    if (matches(refPathArr, this.path)) {
      paths.push(this.path);
    }
  });
  return paths;
};

function getRefPathForDataPath(dataPath = []) {
  return dataPath.reduce((memo, prop) => {
    return `${memo}.${!isNaN(prop) ? '*' : prop}`;
  }, '$').replace(/\.\*$/, ''); // remove trailing '.*'
}

module.exports.getRefPathForDataPath = getRefPathForDataPath;

module.exports.getParentConfigNodePath = function getParentConfigNodePath(path = '') {
  return dropRight(path.split('.')).join('.');
}

module.exports.getParentDataPath = function getParentDataPath(path = []) {
  return dropRight(path);
}

module.exports.getMappedPath = function getMappedPath(dataPath = [], config) {
  let currentSegment = [];
  const currentRealPath = [];
  let mappedPath = [];
  dataPath.forEach(pathItem => {
    currentSegment.push(pathItem);
    currentRealPath.push(pathItem);
    const refPath = getRefPathForDataPath(currentRealPath);
    const configNode = config.getConfigNodeByPath(refPath);
    const isArrayNode = !isNaN(pathItem);
    if (configNode && configNode.data_mapping) {
      // replace current segment with mapping
      currentSegment = [configNode.data_mapping];
      // re-add array index
      if (isArrayNode) {
        currentSegment.push(pathItem);
      }
    }
    // if current pathItem points to array, reset segment
    if (isArrayNode) {
      mappedPath = mappedPath.concat(currentSegment);
      // reset segment for next section
      currentSegment = [];
    }
  });
  mappedPath = mappedPath.concat(currentSegment);
  return mappedPath;
}
