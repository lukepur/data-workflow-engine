import Vue from 'vue';
import Vuex from 'vuex';

import * as actions from './actions';
// import * as getters from './getters';
import engineConfiguration from './modules/engine-configuration';
import engine from './modules/engine';
import workflowState from './modules/workflow-state';

Vue.use(Vuex);

export default new Vuex.Store({
  actions,
  // getters,
  modules: {
    engineConfiguration,
    engine,
    workflowState
  }
});
