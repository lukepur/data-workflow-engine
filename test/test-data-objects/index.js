const loadFile = require('../../src/util/load-file');
const yaml = require('js-yaml');

module.exports = {
  complete: yaml.safeLoad(loadFile('./test/test-data-objects/complete.yaml'))
};
