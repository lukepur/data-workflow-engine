import * as types from '../mutation-types';
// initial state
const state = {
  configurationString: ''
};

// getters
const getters = {
  configurationString: state => state.configurationString
};

// actions
const actions = {};

// mutations
const mutations = {
  [types.UPDATE_ENGINE_CONFIGURATION] (state, {value}) {
    state.configurationString = value;
  }
};

export default {
  state,
  getters,
  actions,
  mutations
};
