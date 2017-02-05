<template>
  <div id="app">
    <app-header></app-header>
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import AppHeader from './components/header.vue';

export default {
  name: 'app',
  components: {
    AppHeader
  }
}
</script>
