<template>
  <div>
    <div v-if="engine" class="workflow-container row">
      <div class="workflow-data-container six columns">
        <h3>Data <span class="quiet"> YAML</span></h3>
        <div class="workflow-data-input-container">
          <textarea class="workflow-data-input" v-model="workflowData"></textarea>
          <button v-on:click="onClickApply(workflowData, engine)" class="btn-apply">Apply</button>
        </div>
      </div>
      <div class="workflow-state-container six columns">
        <h3>Workflow state</h3>
        <div class="workflow-state">
          <pre>{{ JSON.stringify(workflowState, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div v-if="!engine">
      <div class="no-engine-notification">
        <p>There is currently no Workflow engine configured.</p>
        <p>Configure the engine to continue (you can use a sample to get started quickly).</p>
    </div>
    <router-link to="/configure-engine" class="button button-primary">Configure engine</router-link>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import yaml from 'js-yaml';

export default {
  data() {
    return {
      workflowData: 'Test'
    };
  },
  computed: {
    ...mapGetters({
      workflowState: 'workflowState',
      engine: 'engineInstance'
    })
  },
  methods: {
    onClickApply: function (dataStr, engine) {
      try {
        const data = yaml.safeLoad(dataStr);
        this.$store.dispatch('setWorkflowState', {
          engine,
          data
        });
      } catch (e) {
        // TODO: handle case where string is not valid yaml
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.workflow-data-input {
  width: 100%;
  min-height: 30em;
}

.quiet {
  opacity: 0.4;
  font-size: 40%;
}

.btn-apply {
  float: right;
}

.workflow-state {
  border: 1px solid #d3d3d3;
  border-radius: 3px;
  padding: 0.5em;
  max-height: 400px;
  overflow-y: auto;
}
</style>
