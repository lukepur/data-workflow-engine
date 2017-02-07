'use strict';

module.exports.equals = function equals(val1, val2) {
  return val1 === val2;
};

module.exports.greaterThan = function greaterThan(val1, val2) {
  return val1 > val2;
};

module.exports.greaterThanOrEqual = function greaterThanOrEqual(val1, val2) {
  return val1 >= val2;
};

module.exports.lessThan = function lessThan(val1, val2) {
  return val1 < val2;
};

module.exports.lessThanOrEqual = function lessThanOrEqual(val1, val2) {
  return val1 <= val2;
};

module.exports.isBlank = function isBlank(val) {
  return val === undefined || val === null || val === '';
};

module.exports.not = function not(val) {
  return !val;
};