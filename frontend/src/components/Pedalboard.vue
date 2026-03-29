<script setup>
import { useAudioEngine } from '@/composables/useAudioEngine'
import Pedal from './EffectPedal.vue'

const {
  effectsActive,
  startAudio,
  toggleEffect,
  setDist,
  setDelayMix,
  setReverbMix,
  setTone
} = useAudioEngine()

function cambiarValor(tipo, valor) {
  const acciones = {
    distortion: setDist,
    delay:      setDelayMix,
    reverb:     setReverbMix,
    amp:        setTone
  }
  acciones[tipo]?.(valor)
}
</script>

<template>
  <div class="pedalboard">
    <Pedal nombre="Distortion" tipo="distortion" :min="0"   :max="0.2"  :step="0.01" :conBoton="true"  :activo="effectsActive.distortion"
      @cambiarValor="cambiarValor('distortion', $event)" @toggleEfecto="toggleEffect" />
    <Pedal nombre="Ampli"      tipo="amp"         :min="200" :max="2000" :step="50"  :conBoton="false"
      @cambiarValor="cambiarValor('amp', $event)" />
    <Pedal nombre="Delay"      tipo="delay"       :min="0"   :max="1"    :step="0.05" :conBoton="true"  :activo="effectsActive.delay"
      @cambiarValor="cambiarValor('delay', $event)"  @toggleEfecto="toggleEffect" />
    <Pedal nombre="Reverb"     tipo="reverb"      :min="0"   :max="1"    :step="0.05" :conBoton="true"  :activo="effectsActive.reverb"
      @cambiarValor="cambiarValor('reverb', $event)"  @toggleEfecto="toggleEffect" />

    <div class="pedal controls">
      <button @click="startAudio">Iniciar</button>
    </div>
  </div>
</template>