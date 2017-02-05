module.exports.mapValueIn = function mapValueIn(value, arrFrom, arrTo) {
  for (let i = 0; i < arrFrom.length; i += 1) {
    const candidateList = arrFrom[i];
    if (candidateList.indexOf(value) > -1) {
      return arrTo[i];
    }
  }
  return null;
}

module.exports.ifTrueElse = function ifTrueElse(test, trueVal, falseVal) {
  if (test) return trueVal;
  return falseVal;
}
