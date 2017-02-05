const jsyaml = require('js-yaml');

const loadFile = require('../src/util/load-file');

const yaml = loadFile('test/test-configuration.yaml');

const config = jsyaml.safeLoad(yaml);

module.exports = config;
