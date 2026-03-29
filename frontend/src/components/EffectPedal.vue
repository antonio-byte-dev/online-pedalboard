<script setup>
import { computed } from 'vue'

const props = defineProps({
  nombre: String,
  tipo: String,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  step: { type: Number, default: 0.01 },
  conBoton: { type: Boolean, default: false },
  activo: { type: Boolean, default: true }
})

defineEmits(['cambiarValor', 'toggleEfecto'])

const valorInicial = computed(() => (props.min + props.max) / 2)
</script>

<template>
  <div class="pedal" :class="[tipo, { on: activo }]">
    <h3>{{ nombre }}</h3>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="valorInicial"
      @change="$emit('cambiarValor', $event.target.value)"
    />
    <button v-if="conBoton" @click="$emit('toggleEfecto', tipo)">ON/OFF</button>
  </div>
</template>