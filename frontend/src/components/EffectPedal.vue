<script setup>
defineProps({
  name: String,
  type: String,
  hasButton: { type: Boolean, default: false },
  active:    { type: Boolean, default: true },
  controls:  { type: Array, default: () => [] }
})

defineEmits(['changeValue', 'toggleEffect'])

function initialValue(control) {
  return (control.min + control.max) / 2
}
</script>

<template>
  <div class="pedal" :class="[type, { on: active }]">
    <h3>{{ name }}</h3>

    <div v-for="control in controls" :key="control.parameter" class="control">
      <label>{{ control.name }}</label>
      <input
        type="range"
        :min="control.min"
        :max="control.max"
        :step="control.step"
        :value="initialValue(control)"
        @change="$emit('changeValue', { parameter: control.parameter, value: $event.target.value })"
      />
    </div>

    <slot name="extra" />

    <button v-if="hasButton" @click="$emit('toggleEffect', type)">ON/OFF</button>
  </div>
</template>