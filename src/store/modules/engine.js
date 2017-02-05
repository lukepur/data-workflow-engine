import * as types from '../mutation-types';
// initial state
const state = {
  instance: null,
  status: 'Unconfigured'
};

// getters
const getters = {
  engineInstance: state => state.instance,
  engineStatus: state => state.status
};

// actions
const actions = {
  setEngineInstance ({ commit }, instance) {
    commit(types.UPDATE_ENGINE_INSTANCE, { instance });
  }
};

// mutations
const mutations = {
  [types.UPDATE_ENGINE_INSTANCE] (state, { instance }) {
    state.instance = instance;
    state.status = instance ? 'Ready' : 'Unconfigured';
  }
};

export default {
  state,
  getters,
  actions,
  mutations
};
