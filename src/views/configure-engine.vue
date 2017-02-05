<template>
  <div class="configure-engine-container">
    <h2>Configure Engine</h2>
    <span class="configuration-status" :class="configurationStatusClass">{{ configurationStatus }}</span>
    <div class="configuration-string-container">
      <textarea class="configuration-string-input" v-model="draftString" v-on:change="onConfigurationStringChange"></textarea>
    </div>
    <div class="controls">
      <router-link to="/"> &lt; Back </router-link>
      <div class="actions">
        <button v-on:click="onClickLoadSample">Load sample</button>
        <button class="button-primary apply" v-on:click="onClickSave(instance)" :disabled="configurationStatus === 'Invalid'">Apply</button>
      </div>
    </div>
  </div>
</template>

<script>
import sample from '../helpers/load-sample-yaml';
import DataEngine from 'data-workflow-engine';
import yaml from 'js-yaml';

export default {
  name: 'configure-engine',
  data() {
    return {
      draftString: '',
      instance: null
    };
  },
  computed: {
    configurationStatus: function () {
      return this.instance ? 'Valid' : 'Invalid';
    },
    configurationStatusClass: function() {
      return this.configurationStatus.toLowerCase();
    }
  },
  methods: {
    onClickSave: function (instance) {
      if (instance) {
        this.$store.dispatch('setEngineInstance', instance);
        this.$router.push('/');
      }
    },
    onClickLoadSample: function() {
      this.draftString = sample;
      this.applyConfigurationString(sample);
    },
    onConfigurationStringChange(e) {
      this.applyConfigurationString(e.target.value);
    },
    applyConfigurationString(str) {
      try {
        const config = yaml.safeLoad(str);
        const engine = DataEngine.create(config);
        // if we can get the workflow state of an empty object, the instance
        // is valid:
        engine.getWorkflowState({});
        this.instance = engine;
      } catch (e) {
        // TODO: handle exceptions, either yaml invalid, or config invalid
        console.log('e:', e);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.configuration-status {
  float: right;
  margin-top: -1.5em;
}

.configuration-status.valid {
  color: green;
}

.configuration-status.invalid {
  color: red;
}

.configuration-string-input {
  width: 100%;
  min-height: 15em;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.actions {
  display: flex;
  justify-content: flex-end;
}

button.apply {
  margin-left: 1em;
}
</style>
