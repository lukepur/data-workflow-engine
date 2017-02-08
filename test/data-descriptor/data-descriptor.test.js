const { cloneDeep } = require('lodash');
const expect = require('chai').expect;

const DataDescriptor = require('../../src/data-descriptor/data-descriptor');
const testConfig = require('../test-configuration');

describe('data-descriptor', () => {
  it('should have a create function', () => {
    expect(DataDescriptor.create).to.be.a('function');
  });

  describe('engine configuration', () => {
    it('should remove unknown properties from the configuration', () => {
      const config = cloneDeep(testConfig);
      config.aux = {
        a: 'pleas remove'
      };

      config.sections[1].children[1].options = [
        {
          label: 'label',
          value: 'true'
        }
      ];
      const instanceConfig = DataDescriptor.create(config);
      expect(instanceConfig.aux).not.to.exist;
      expect(instanceConfig.sections[1].children[1].options).not.to.exist;
    });
  });

});
