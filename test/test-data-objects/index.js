const loadFile = require('../../util/load-file');
const yaml = require('js-yaml');

module.exports = {
  unmetPreconditions: yaml.safeLoad(loadFile('./test/test-data-objects/unmet-preconditions.yaml')),
  complete: yaml.safeLoad(loadFile('./test/test-data-objects/complete.yaml')),
  assetPruned: yaml.safeLoad(loadFile('./test/test-data-objects/asset-pruned.yaml')),
  anonymous: yaml.safeLoad(loadFile('./test/test-data-objects/anonymous.yaml')),
  validations: yaml.safeLoad(loadFile('./test/test-data-objects/validations.yaml'))
};
