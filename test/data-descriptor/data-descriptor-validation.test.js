const { expect } = require('chai');
const { cloneDeep, find, omit } = require('lodash');

const DataDescriptor = require('../../src/data-descriptor/data-descriptor');
const MESSAGES = require('../../src/data-descriptor/validation-message-map');
const testConfig = require('../test-configuration');

describe('workflow configuration validation', () => {
  describe('configuration sanity check', () => {
    it('should throw an error if configuration object is not defined', () => {
      const fn = () => DataDescriptor.create();
      expect(fn).to.throw(MESSAGES.CONFIG_UNDEFINED);
    });

    it('should throw an error if configuration object is not an object', () => {
      const fn = () => DataDescriptor.create('config');
      expect(fn).to.throw(MESSAGES.CONFIG_NOT_OBJECT);
    });
  });

  describe('section validations', () => {
    it('should throw an error if no sections present', () => {
      const fn = () => DataDescriptor.create({});
      expect(fn).to.throw(MESSAGES.NO_SECTIONS);
    });

    it('should throw an error if sections is not array', () => {
      const fn = () => DataDescriptor.create({ sections: {} });
      expect(fn).to.throw(MESSAGES.SECTIONS_NOT_ARRAY);
    });

    it('should throw an error if sections is empty array', () => {
      const fn = () => DataDescriptor.create({ sections: [] });
      expect(fn).to.throw(MESSAGES.SECTIONS_EMPTY_ARRAY);
    });

  });

  describe('edge validations', () => {
    it('should throw an error if there are decision nodes but edges not array', () => {
      const config = getConfig();
      config.edges = undefined;
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGES_NOT_ARRAY);
    });

    it('should throw an error if there are decision nodes but edges array empty', () => {
      const config = getConfig();
      config.edges = [];
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGES_EMPTY);
    });

    it('should throw an error if an edge `to` property points to non-existent node', () => {
      const config = getConfig();
      config.edges[0].to = 'non_existent_id';
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_TO_NON_EXISTENT('non_existent_id'));
    });

    it('should throw an error if an edge `from` property points to non-existent node', () => {
      const config = getConfig();
      config.edges[0].from = 'non_existent_id';
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_FROM_NON_EXISTENT('non_existent_id'));
    });

    it('should throw an error if section has edge to it, if that section goes to START', () => {
      const config = getConfig();
      // add new section
      config.sections.push({
        id: 'new_section_1',
        type: 'section'
      });

      // add edge from new section to pre-start node 'global'
      config.edges.push({
        to: 'global',
        from: 'new_section_1'
      });
      const fn = () => DataDescriptor.create(config);

      expect(fn).to.throw(MESSAGES.MULTIPLE_PRE_START_NODES({from: 'new_section_1', to: 'global'}));
    });

    it('should throw an error if section has no edges going from it', () => {
      const config = getConfig();
      // make recommend_us section not go anywhere:
      config.edges = config.edges.filter(edge => edge.from !== 'recommend_us');
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_UNEXPECTED_PATH_TERMINATION('recommend_us'));
    });

    it('should throw an error if section has multiple edges going from it', () => {
      const config = getConfig();
      config.edges.push({from: 'premium_enrollment', to: 'recommend_us'});
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_MULTIPLE_EDGES_FROM_SECTION('premium_enrollment'));
    });

    it('should throw an error if section appears in no edges as the `to` node', () => {
      const config = getConfig();
      config.sections.push({
        id: 'no_edge_to_me',
        type: 'section'
      });
      config.edges.push({
        to: 'END',
        from: 'no_edge_to_me'
      });
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_UNREACHABLE_NODE('no_edge_to_me'));
    });
  });

  describe('decision validations', () => {
    it('should throw an error if decision id is a duplicate', () => {
      const config = getConfig();
      // set first decision id to same as a section id
      config.decisions[0].id = 'global';
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.DUPLICATE_NODE_ID('global'));
    });

    it('should throw an error if decision node has no `when_input_is: true` edge', () => {
      const config = getConfig();
      // remove true decision path for meets_premium_requirements:
      config.edges = config.edges.map(edge => {
        if (edge.from === 'meets_premium_requirements' && edge.when_input_is === true) {
          return omit(edge, 'when_input_is');
        }
        return edge;
      });
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_NO_TRUE_DECISION_PATH('meets_premium_requirements'));
    });

    it('should throw an error if decision node has no `when_input_is: false` edge', () => {
      const config = getConfig();
      // remove false decision path for meets_premium_requirements:
      config.edges = config.edges.map(edge => {
        if (edge.from === 'meets_premium_requirements' && edge.when_input_is === false) {
          return omit(edge, 'when_input_is');
        }
        return edge;
      });
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_NO_FALSE_DECISION_PATH('meets_premium_requirements'));
    });

    it('should throw an error if decision node has more than 2 from edges', () => {
      const config = getConfig();
      // add superfluous edge
      config.edges.push({
        from: 'meets_premium_requirements',
        to: 'END'
      });
      const fn = () => DataDescriptor.create(config);
      expect(fn).to.throw(MESSAGES.EDGE_TOO_MANY_DECISION_PATHS('meets_premium_requirements'));
    });
  });

  describe('valid configuration', () => {
    it('should not throw an error for valid test configuration', () => {
      const fn = function() {
        DataDescriptor.create(getConfig());
      }
      expect(fn).not.to.throw(Error);
    });
  });
});

function getConfig() {
  return cloneDeep(testConfig);
}
