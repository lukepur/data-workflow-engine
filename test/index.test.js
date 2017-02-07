const expect = require('chai').expect;
const { cloneDeep, find } = require('lodash');

const DataEngine = require('../src/index');
const testConfig = require('./test-configuration');
const testData = require('./test-data-objects');

describe('data-engine', () => {
  it('should create a data-engine instance', () => {
    expect(DataEngine.create(testConfig)).to.exist;
  });

  describe('getWorkflowState method', () => {
    let instance;

    beforeEach(() => {
      instance = DataEngine.create(testConfig);
    });

    it('should exist', () => {
      const instance = DataEngine.create(testConfig);
      expect(instance.getWorkflowState).to.be.a('function');
    });

    describe('data property', () => {

      it('should have a data property', () => {
        expect(instance.getWorkflowState({}).data).to.exist;
      });

      it('should remove unmet single precondition', () => {
        const data = testData.unmetPreconditions;
        expect(data.personal_details.name.title).to.exist;
        expect(data.personal_details.doctor_type).to.exist;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.personal_details.name.title).to.exist;
        expect(workflowState.data.personal_details.doctor_type).not.to.exist;
      });

      it('should remove unmet relative ref precondition', () => {
        const data = testData.unmetPreconditions;
        expect(data.asset_details.assets[0].value).to.eql(10000);
        expect(data.asset_details.assets[1].value).to.eql(2000);
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.asset_details.assets[0].value).to.eql(10000);
        expect(workflowState.data.asset_details.assets[1].value).to.be.undefined;
      });

      it('should remove descendants of unmet precondition node', () => {
        const data = testData.anonymous;
        expect(data.personal_details.name.title).to.eql('will_be_pruned');
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.personal_details.name).not.to.exist;
      });
    });

    describe('derived property', () => {
      it('should exist', () => {
        const data = testData.complete;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived).to.exist;
      });

      it('should include correctly calculated property', () => {
        const data = testData.complete;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_value).to.eql(1012000);
      });

      it('should not include pruned values in calculated property', () => {
        const data = testData.assetPruned;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_value).to.eql(3000);
      });

      it('should allow nested functions', () => {
        const data = testData.complete;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_adjusted).to.eql(1022000);
      });
    });

    describe('input_section_states property', () => {
      it('should exist', () => {
        const data = getDataMock('validations');
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.input_section_states).to.exist;
      });

      it('should include a validation error for basic missing required field', () => {
        const data = getDataMock('validations');
        data.application_details.location = '';
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.application_details.validationMessages).to.contain({
          path: 'application_details.location',
          message: 'Location of application is required'
        });
      });

      it('should not include a validation error for basic present required field', () => {
        const data = getDataMock('validations');
        data.application_details.location = 'London';
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.application_details.validationMessages).not.to.contain({
          path: 'application_details.location',
          message: 'Location of application is required'
        });
      });

      it('should not include a validation error for basic required field if ancestral precondition not met', () => {
        const data = getDataMock('validations');
        data.personal_details.is_anonymous = true;
        data.personal_details.name = undefined;
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.name.title',
          message: 'Title is required'
        });
      });

      it('should include a validation message for a missing required array', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = undefined;
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should include a validation message for an empty required array', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = [];
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should include a validation message for an array with one blank string', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = [''];
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should not include a validation message for an array with a non-blank string', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = ['a'];
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should not include a validation message for an array with a 0', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = [0];
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should not include a validation message for an array with false', () => {
        const data = getDataMock('validations');
        data.personal_details.contact_numbers = [false];
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should include a validation message for a required property which is descendant of array_group', () => {
        const data = getDataMock('validations');
        data.asset_details.assets[0].description = '';
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.asset_details.validationMessages).to.contain({
          path: 'asset_details.assets.0.description',
          message: 'Asset description is required'
        });
      });

      it('should not include a validation message for a required property which is descendant of array_group if non-required ancestor is absent', () => {
        const data = getDataMock('validations');
        data.previous_applications.items[0].comments = undefined;
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.previous_applications.validationMessages).not.to.contain({
          path: 'previous_applications.comments.0.author',
          message: 'Author of comment is required'
        });
      });

      // custom validations
      it('should include a message for a custom validation failure if field is present', () => {
        const data = getDataMock('validations');
        data.asset_details.assets[0].value = 'nan';
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.asset_details.validationMessages).to.contain({
          path: 'asset_details.assets.0.value',
          message: 'Value must be a number'
        });
      });

      it('should include a message for a custom validation failure if field is present but not required', () => {
        const data = getDataMock('validations');
        data.personal_details.name.first = 'a';
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.name.first',
          message: 'First name must be at least 2 characters long'
        });
      });

      it('should not include a message for a custom validation failure if field is not present', () => {
        const data = getDataMock('validations');
        data.personal_details.name.first = undefined;
        const { input_section_states } = instance.getWorkflowState(data);
        expect(input_section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.name.first',
          message: 'First name must be at least 2 characters long'
        });
      });
    });

    describe('edge_states', () => {
      it('should have an edge_states property', () => {
        expect(instance.getWorkflowState({}).edge_states).to.exist;
      });

      it('should set the status of START edges to "active"', () => {
        const data = getDataMock('validations');
        const { edge_states } = instance.getWorkflowState(data);
        const startEdge = find(edge_states, {from: 'START'});
        expect(startEdge.status).to.eql('active');
      });

      it('should set the status of edges from a valid section to "active"', () => {
        const data = getDataMock('validations');
        const { edge_states } = instance.getWorkflowState(data);
        const edgeFromApplicationDetails = find(edge_states, {from: 'application_details'});
        expect(edgeFromApplicationDetails.status).to.eql('active');
      });

      it('should set the status of edges from an invalid section to "inactive"', () => {
        const data = getDataMock('validations');
        data.application_details.location = '';
        const { edge_states } = instance.getWorkflowState(data);
        const edgeFromApplicationDetails = find(edge_states, {from: 'application_details'});
        expect(edgeFromApplicationDetails.status).to.eql('inactive');
      });

      it('should set the status of edges from an valid section to "inactive" if there is no valid path to that section', () => {
        const data = getDataMock('validations');
        const { edge_states: edgeStatesBefore } = instance.getWorkflowState(data);
        let edgeFromApplicationDetails = find(edgeStatesBefore, {from: 'application_details'});
        let edgeFromPersonalDetails = find(edgeStatesBefore, {from: 'personal_details'});
        expect(edgeFromApplicationDetails.status).to.eql('active');
        expect(edgeFromPersonalDetails.status).to.eql('active');
        data.application_details.location = '';
        const { edge_states: edgeStatesAfter } = instance.getWorkflowState(data);
        edgeFromApplicationDetails = find(edgeStatesAfter, {from: 'application_details'});
        edgeFromPersonalDetails = find(edgeStatesAfter, {from: 'personal_details'});
        expect(edgeFromApplicationDetails.status).to.eql('inactive');
        expect(edgeFromPersonalDetails.status).to.eql('inactive');
      });

      it('should set the status of edge from truth decision to "active" when output is true', () => {
        const data = getDataMock('validations');
        const { edge_states } = instance.getWorkflowState(data);
        const decisionTrueEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: true});
        expect(decisionTrueEdge.status).to.eql('active');
      });

      it('should set the status of edge from truth decision to "inactive" when output is false', () => {
        const data = getDataMock('validations');
        data.asset_details.assets[0].value = 1;
        data.asset_details.assets[1].value = 1;
        const { edge_states } = instance.getWorkflowState(data);
        const decisionTrueEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: true});
        expect(decisionTrueEdge.status).to.eql('inactive');
      });

      it('should set the status of edge from false decision to "active" when output is false', () => {
        const data = getDataMock('validations');
        data.asset_details.assets[0].value = 1;
        data.asset_details.assets[1].value = 1;
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('active');
      });

      it('should set the status of edge from false decision to "inactive" when output is true', () => {
        const data = getDataMock('validations');
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('inactive');
      });

      it('should set the status of edge from decision to "inactive" if node is unreachable', () => {
        const data = getDataMock('validations');
        data.asset_details.assets = undefined; // break the pathway to the decision node
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('inactive');
      });
    });
  });
});

function getDataMock(type) {
  return cloneDeep(testData[type]);
}
