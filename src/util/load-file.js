const fs = require('fs');
const path = require('path');

module.exports = function loadFile(projectPath) {
  return fs.readFileSync(path.resolve(projectPath), { encoding: 'utf8'});
};
