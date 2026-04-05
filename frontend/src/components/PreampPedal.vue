<script setup>
defineProps({
  controls: {
    type: Array,
    default: () => [
      { parameter: 'bass',   name: 'Bass',   min: -12, max: 12, step: 1 },
      { parameter: 'mid',    name: 'Mid',    min: -12, max: 12, step: 1 },
      { parameter: 'treble', name: 'Treble', min: -12, max: 12, step: 1 }
    ]
  }
})

defineEmits(['changeValue'])

function initialValue(control) {
  return (control.min + control.max) / 2
}
</script>

<template>
  <div class="pedal preamp amp">
    <h3>Preamp</h3>

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
  </div>
</template>