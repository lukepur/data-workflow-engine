const expect = require('chai').expect;
const { cloneDeep, find } = require('lodash');

const DataEngine = require('../src/index');
const testConfig = require('./test-configuration');
const testData = require('./test-data-objects');

describe('data-engine', () => {
  let data;

  beforeEach(() => {
    data = getDataMock('complete');
  });

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
        expect(data.personal_details.name.title).to.exist;
        expect(data.personal_details.doctor_type).to.exist;
        data.personal_details.name.title = 'ms';
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.personal_details.name.title).to.exist;
        expect(workflowState.data.personal_details.doctor_type).not.to.exist;
      });

      it('should remove unmet relative ref precondition', () => {
        data.asset_details.assets[0].value_known = false;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.asset_details.assets[0].value).to.be.undefined;
      });

      it('should remove descendants of unmet precondition node', () => {
        data.personal_details.is_anonymous = true;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.data.personal_details.name).not.to.exist;
      });

      it('should remove unreachable sections', () => {
        expect(data.liability_details).to.exist;
        data.asset_details.assets = undefined;
        const { data: result } = instance.getWorkflowState(data);
        expect(result.liability_details).not.to.exist;
      });

      it('should remove section excluded by decision', () => {
        let { data: result } = instance.getWorkflowState(data);
        expect(result.premium_enrollment).to.exist;
        data.asset_details.assets[0].value = 1;
        data.asset_details.assets[1].value = 1;
        result = instance.getWorkflowState(data).data;
        expect(result.premium_enrollment).not.to.exist;
      });

      describe('data_mapping feature', () => {

        it('should add a `mapped_data` property to state object', () => {
          const { mapped_data: result } = instance.getWorkflowState(data);
          expect(result).to.exist;
        });

        it('should map a static field to specified root property', () => {
          const { mapped_data: result } = instance.getWorkflowState(data);
          expect(result.previous_applications_exist).to.be.true;
        });

        it('should map an array descendant relative to unmapped array', () => {
          const { mapped_data: result } = instance.getWorkflowState(data);
          expect(result.liability_details.liabilities[0].liability_value).to.eql(5000);
        });

        it('should map all levels of a deep value in an array', () => {
          const { mapped_data: result } = instance.getWorkflowState(data);
          expect(result.previous_applications[0].comments[0].comment_author).to.eql('Bob');
        });
      });
    });

    describe('derived property', () => {
      it('should exist', () => {
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived).to.exist;
      });

      it('should include correctly calculated property', () => {
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_value).to.eql(10001000);
      });

      it('should not include pruned values in calculated property', () => {
        data.asset_details.assets[1].value_known = false;
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_value).to.eql(1000);
      });

      it('should allow nested functions', () => {
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.derived.assets_total_adjusted).to.eql(10011000);
      });
    });

    describe('section_states property', () => {
      it('should exist', () => {
        const workflowState = instance.getWorkflowState(data);
        expect(workflowState.section_states).to.exist;
      });

      it('should include a validation error for basic missing required field', () => {
        data.application_details.location = '';
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.application_details.validationMessages).to.contain({
          path: 'application_details.location',
          message: 'Location of application is required'
        });
      });

      it('should not include a validation error for basic present required field', () => {
        data.application_details.location = 'London';
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.application_details.validationMessages).not.to.contain({
          path: 'application_details.location',
          message: 'Location of application is required'
        });
      });

      it('should not include a validation error for basic required field if ancestral precondition not met', () => {
        data.personal_details.is_anonymous = true;
        data.personal_details.name = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.name.title',
          message: 'Title is required'
        });
      });

      it('should include a validation message for missing required field when preconditions are met', () => {
        data.asset_details.assets[0].value = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.asset_details.validationMessages).to.contain({
          path: 'asset_details.assets.0.value',
          message: 'Asset value is required'
        });
      })

      it('should include a validation message for a missing required array', () => {
        data.personal_details.contact_numbers = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'Contact numbers are required'
        });
      });

      it('should include a validation message for an empty required array', () => {
        data.personal_details.contact_numbers = [];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'Contact numbers are required'
        });
      });

      it('should include a validation message for an array with one blank string', () => {
        data.personal_details.contact_numbers = [''];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'Contact numbers are required'
        });
      });

      it('should include a validation message if array_value validation fails', () => {
        data.personal_details.contact_numbers = ['1234'];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least 2 contact numbers are required'
        });
      });

      it('should include a validation message for both array level and element level failures', () => {
        data.personal_details.contact_numbers = ['a'];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least 2 contact numbers are required'
        });
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.contact_numbers.0',
          message: 'Contact numbers must be numeric'
        });
      });

      it('should not include a validation message for valid array_value', () => {
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.eql([]);
      });

      it('should not include a validation message for an array with a 0', () => {
        data.personal_details.contact_numbers = [0];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should not include a validation message for an array with false', () => {
        data.personal_details.contact_numbers = [false];
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.contact_numbers',
          message: 'At least one contact number is required'
        });
      });

      it('should include a validation message for a required property which is descendant of array_group', () => {
        data.asset_details.assets[0].description = '';
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.asset_details.validationMessages).to.contain({
          path: 'asset_details.assets.0.description',
          message: 'Asset description is required'
        });
      });

      it('should not include a validation message for a required property which is descendant of array_group if non-required ancestor is absent', () => {
        data.previous_applications.items[0].comments = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.previous_applications.validationMessages).not.to.contain({
          path: 'previous_applications.comments.0.author',
          message: 'Author of comment is required'
        });
      });

      // custom validations
      it('should include a message for a custom validation failure if field is present', () => {
        data.asset_details.assets[0].value = 'nan';
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.asset_details.validationMessages).to.contain({
          path: 'asset_details.assets.0.value',
          message: 'Value must be a number'
        });
      });

      it('should include a message for a custom validation failure if field is present but not required', () => {
        data.personal_details.name.first = 'a';
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).to.contain({
          path: 'personal_details.name.first',
          message: 'First name must be at least 2 characters long'
        });
      });

      it('should not include a message for a custom validation failure if field is not present', () => {
        data.personal_details.name.first = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.personal_details.validationMessages).not.to.contain({
          path: 'personal_details.name.first',
          message: 'First name must be at least 2 characters long'
        });
      });

      it('should set unreachable section status', () => {
        data.asset_details.assets[0].value = undefined;
        const { section_states } = instance.getWorkflowState(data);
        expect(section_states.liability_details.status).to.eql('unreachable');
      });
    });

    describe('edge_states', () => {
      it('should have an edge_states property', () => {
        expect(instance.getWorkflowState({}).edge_states).to.exist;
      });

      it('should set the status of START edges to "active"', () => {
        const { edge_states } = instance.getWorkflowState(data);
        const startEdge = find(edge_states, {from: 'START'});
        expect(startEdge.status).to.eql('active');
      });

      it('should set the status of edges from a valid section to "active"', () => {
        const { edge_states } = instance.getWorkflowState(data);
        const edgeFromApplicationDetails = find(edge_states, {from: 'application_details'});
        expect(edgeFromApplicationDetails.status).to.eql('active');
      });

      it('should set the status of edges from an invalid section to "inactive"', () => {
        data.application_details.location = '';
        const { edge_states } = instance.getWorkflowState(data);
        const edgeFromApplicationDetails = find(edge_states, {from: 'application_details'});
        expect(edgeFromApplicationDetails.status).to.eql('inactive');
      });

      it('should set the status of edges from an valid section to "inactive" if there is no valid path to that section', () => {
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
        const { edge_states } = instance.getWorkflowState(data);
        const decisionTrueEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: true});
        expect(decisionTrueEdge.status).to.eql('active');
      });

      it('should set the status of edge from truth decision to "inactive" when output is false', () => {
        data.asset_details.assets[0].value = 1;
        data.asset_details.assets[1].value = 1;
        const { edge_states } = instance.getWorkflowState(data);
        const decisionTrueEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: true});
        expect(decisionTrueEdge.status).to.eql('inactive');
      });

      it('should set the status of edge from false decision to "active" when output is false', () => {
        data.asset_details.assets[0].value = 1;
        data.asset_details.assets[1].value = 1;
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('active');
      });

      it('should set the status of edge from false decision to "inactive" when output is true', () => {
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('inactive');
      });

      it('should set the status of edge from decision to "inactive" if node is unreachable', () => {
        data.asset_details.assets = undefined; // break the pathway to the decision node
        const { edge_states } = instance.getWorkflowState(data);
        const decisionFalseEdge = find(edge_states, {from: 'meets_premium_requirements', when_input_is: false});
        expect(decisionFalseEdge.status).to.eql('inactive');
      });
    });
  });

  describe('nextSection method', () => {
    let instance;

    beforeEach(() => {
      instance = DataEngine.create(testConfig);
    });

    it('should exist', () => {
      expect(instance.nextSection).to.be.a('function');
    });

    it('should return the first section if the currentSectionId is START', () => {
      expect(instance.nextSection('START', data)).to.eql({sectionId: 'application_details'});
    });

    it('should return null if the currentSectionId is END', () => {
      expect(instance.nextSection('END', data)).to.eql(null);
    });

    it('should return the next section if the current section is reachable and valid', () => {
      expect(instance.nextSection('application_details', data)).to.eql({sectionId: 'personal_details'});
    });

    it('should return the next section even if that section is "valid" by default (e.g. no required fields)', () => {
      expect(instance.nextSection('premium_enrollment', data)).to.eql({sectionId: 'final_notes'});
    });

    it('should return the same sectionId with validationMessages if the current section is reachable but invalid', () => {
      data.application_details.location = undefined;
      expect(instance.nextSection('application_details', data)).to.eql({
        sectionId: 'application_details',
        validationMessages: [{
          path: 'application_details.location',
          message: 'Location of application is required'
        }]
      });
    });

    it('should return the last reachable sectionId with validationMessages if the current section is unreachable', () => {
      data.application_details.location = undefined;
      expect(instance.nextSection('asset_details', data)).to.eql({
        sectionId: 'application_details',
        validationMessages: [{
          path: 'application_details.location',
          message: 'Location of application is required'
        }]
      });
    });

    it('should return END if the next section is END', () => {
      expect(instance.nextSection('final_notes', data)).to.eql({ sectionId: 'END' });
    });
  });

  describe('previousSection method', () => {
    let instance;

    beforeEach(() => {
      instance = DataEngine.create(testConfig);
    });

    it('should exist', () => {
      expect(instance.previousSection).to.be.a('function');
    });

    it('should return null if the currentSectionId is START', () => {
      expect(instance.previousSection('START', data)).to.eql(null);
    });

    it('should return START if the currentSectionId is first_section', () => {
      expect(instance.previousSection('application_details', data)).to.eql({sectionId: 'START'});
    });

    it('should return the previous section if the current section is reachable and valid', () => {
      expect(instance.previousSection('personal_details', data)).to.eql({sectionId: 'application_details'});
    });

    it('should return the previous section if the current section is reachable but invalid', () => {
      data.personal_details.name.title = undefined;
      expect(instance.previousSection('personal_details', data)).to.eql({ sectionId: 'application_details' });
    });

    it('should return the last  previous reachable sectionId with validationMessages if the current section is unreachable', () => {
      data.asset_details.assets[0].value = 1;
      data.asset_details.assets[1].value = 1;
      expect(instance.previousSection('premium_enrollment', data)).to.eql({
        sectionId: 'previous_applications',
        validationMessages: []
      });
    });
  });

  describe('isSectionReachable method', () => {
    let instance;

    beforeEach(() => {
      instance = DataEngine.create(testConfig);
    });

    it('should exist', () => {
      expect(instance.isSectionReachable).to.be.a('function');
    });

    it('should return true for START', () => {
      expect(instance.isSectionReachable('START', data)).to.be.true;
    });

    it('should return true for reachable sections', () => {
      expect(instance.isSectionReachable('application_details', data)).to.be.true;
      expect(instance.isSectionReachable('personal_details', data)).to.be.true;
      expect(instance.isSectionReachable('asset_details', data)).to.be.true;
      expect(instance.isSectionReachable('liability_details', data)).to.be.true;
      expect(instance.isSectionReachable('previous_applications', data)).to.be.true;
      expect(instance.isSectionReachable('premium_enrollment', data)).to.be.true;
      expect(instance.isSectionReachable('final_notes', data)).to.be.true;
      expect(instance.isSectionReachable('END', data)).to.be.true;
    });

    it('should return false for sections excluded by decisions', () =>{
      data.asset_details.assets[0].value = 1;
      data.asset_details.assets[1].value = 1;
      expect(instance.isSectionReachable('application_details', data)).to.be.true;
      expect(instance.isSectionReachable('personal_details', data)).to.be.true;
      expect(instance.isSectionReachable('asset_details', data)).to.be.true;
      expect(instance.isSectionReachable('liability_details', data)).to.be.true;
      expect(instance.isSectionReachable('previous_applications', data)).to.be.true;
      expect(instance.isSectionReachable('premium_enrollment', data)).to.be.false;
      expect(instance.isSectionReachable('final_notes', data)).to.be.true;
      expect(instance.isSectionReachable('END', data)).to.be.true;
    });

    it('should return false for sections excluded by previous section validation failures', () => {
      data.personal_details.name.title = '';
      expect(instance.isSectionReachable('application_details', data)).to.be.true;
      expect(instance.isSectionReachable('personal_details', data)).to.be.true;
      expect(instance.isSectionReachable('asset_details', data)).to.be.false;
      expect(instance.isSectionReachable('liability_details', data)).to.be.false;
      expect(instance.isSectionReachable('previous_applications', data)).to.be.false;
      expect(instance.isSectionReachable('premium_enrollment', data)).to.be.false;
      expect(instance.isSectionReachable('final_notes', data)).to.be.false
      expect(instance.isSectionReachable('END', data)).to.be.false;
    });
  });
});

function getDataMock(type) {
  return cloneDeep(testData[type]);
}
