<!-- components/ui/BaseButton.vue -->
<template>
  <button :class="['btn', variant]">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: String // distortion, delay, etc
})
</script>

<style scoped>
.btn {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-bright);
  background: transparent;
  font-family: var(--font-display);
  letter-spacing: 0.2em;
  font-size: 0.65em;
  cursor: pointer;
}

/* Variants reuse pedal colors */
.btn.distortion { color: var(--accent-distortion); border-color: var(--accent-distortion); }
.btn.delay      { color: var(--accent-delay); }
.btn.reverb     { color: var(--accent-reverb); }

.btn:hover {
  color: var(--text-primary);
}
</style>