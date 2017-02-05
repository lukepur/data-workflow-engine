import * as types from '../mutation-types';
// initial state
const state = {
  workflowState: null
};

// getters
const getters = {
  workflowState: state => state.workflowState
};

// actions
const actions = {
  setWorkflowState ({ commit }, { engine, data }) {
    if (engine) {
      commit(types.UPDATE_WORKFLOW_STATE, engine.getWorkflowState(data));
    }
  }
};

// mutations
const mutations = {
  [types.UPDATE_WORKFLOW_STATE] (state, workflowState) {
    state.workflowState = workflowState;
  }
};

export default {
  state,
  getters,
  actions,
  mutations
};
