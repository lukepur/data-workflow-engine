import Vue from 'vue';
import VueRouter from 'vue-router';

import workflow from './views/workflow.vue';
import configureEngine from './views/configure-engine.vue';

Vue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/', component: workflow },
    { path: '/configure-engine', component: configureEngine }
  ]
});

export default router;
