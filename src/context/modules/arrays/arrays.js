const { get } = require('lodash');

module.exports.isInArray = function isInArray(val, arr) {
  if (!Array.isArray(arr)) {
    return false;
  }

  return arr.indexOf(val) > -1;
}

module.exports.arrayOfProp = function arrayOfProp(arr, prop) {
  if (!Array.isArray(arr)) {
    return null;
  }

  return arr.map(item => get(item, prop));
}

module.exports.arrayLength = function arrayLength(arr) {
  if (!Array.isArray(arr)) {
    return null;
  }
  return arr.length;
}
