module.exports.isNumber = function isNumber(value) {
  return !isNaN(value);
}

module.exports.isNumeric = function isNumeric(str) {
  return !!(''+str).match(/^\d\d*$/);
}
