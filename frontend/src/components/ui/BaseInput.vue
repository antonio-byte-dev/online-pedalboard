<!-- components/ui/BaseInput.vue -->
<template>
  <input 
    class="input" 
    v-bind="$attrs" 
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
<style scoped>
.input {
  width: 100%;
  background: #0a0a0a;
  border: 1px solid var(--border);
  padding: 8px;
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 0.7em;
}

.input:focus {
  border-color: var(--border-bright);
  outline: none;
}
</style>