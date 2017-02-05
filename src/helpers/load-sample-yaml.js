// brfs will allow the use of the 'filesystem'
var fs = require('fs');
var path = require('path');

module.exports = fs.readFileSync(
  path.join(
    __dirname,
    '../../node_modules/data-workflow-engine/test/test-configuration.yaml'
  ), 'utf8');
