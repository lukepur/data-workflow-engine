'use strict';

module.exports.length = function length(value) {
  if (typeof value === 'string') {
    return value.length;
  }
  return null;
};