<template>
  <div class="header-container">
    <div class="container">
      <div class="row">
        <div class="full column">
          <div class="header-main">
            <h1>Data Workflow Engine</h1>
            <router-link to="/configure-engine" class="button">Configure</router-link>
          </div>
          <div class="header-engine-status">
            <span class="engine-status-label">Engine status: </span>
            <span class="engine-status-value" :class=engineStatusClass>{{ engineStatus }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'app-header',
  data () {
    return {};
  },
  computed: {
    ...mapGetters({
      engineStatus: 'engineStatus'
    }),
    engineStatusClass: function () {
      return this.engineStatus.toLowerCase();
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/scss/_variables';

h1 {
  color: $brand-primary;
}

.row {
  border-bottom: 1px solid #d3d3d3;
}

.header-container {
  width: 100%;
  padding: 1em 0;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-engine-status {
  margin: -1em 0 0.25em 0.25em;
}

.engine-status-value.ready {
  color: green;
}

.engine-status-value.unconfigured {
  color: red;
}
</style>
