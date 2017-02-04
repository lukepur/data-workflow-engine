module.exports = function prettyJSON (obj) {
  return JSON.stringify(obj, null, 2);
}
