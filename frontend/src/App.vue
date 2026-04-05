<!-- App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

#app > * {
  flex: 1;
  width: 100%;
}
</style>