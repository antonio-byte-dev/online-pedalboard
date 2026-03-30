<script setup>
import { useAudioEngine } from '@/composables/useAudioEngine'
import EffectPedal from './EffectPedal.vue'

const {
  effectsActive,
  startAudio,
  toggleEffect,
  loadCustomIR,
  setDist,
  setDelayMix, setDelayFeedback, setDelayTime,
  setReverbMix, setReverbDecay,
  setBass, setMid, setTreble
} = useAudioEngine()

function handleValueChange(type, { parameter, value }) {
  const actions = {
    distortion: { gain:     setDist },
    delay:      { mix:      setDelayMix,
                  feedback: setDelayFeedback,
                  time:     setDelayTime },
    reverb:     { mix:      setReverbMix,
                  decay:    setReverbDecay },
    amp:        { bass:     setBass,
                  mid:      setMid,
                  treble:   setTreble }
  }
  actions[type]?.[parameter]?.(value)
}

function onIRUpload(event) {
  const file = event.target.files[0]
  if (file) loadCustomIR(file)
}
</script>

<template>
  <div class="pedalboard">

    <EffectPedal
      name="Distortion" type="distortion"
      :hasButton="true" :active="effectsActive.distortion"
      :controls="[
        { parameter: 'gain', name: 'Gain', min: 0, max: 0.5, step: 0.01 }
      ]"
      @changeValue="handleValueChange('distortion', $event)"
      @toggleEffect="toggleEffect"
    />

    <EffectPedal
      name="Amp" type="amp"
      :hasButton="false"
      :controls="[
        { parameter: 'bass',   name: 'Bass',   min: -12, max: 12, step: 1 },
        { parameter: 'mid',    name: 'Mid',    min: -12, max: 12, step: 1 },
        { parameter: 'treble', name: 'Treble', min: -12, max: 12, step: 1 }
      ]"
      @changeValue="handleValueChange('amp', $event)"
    >
      <template #extra>
        <input type="file" accept=".wav" @change="onIRUpload" />
      </template>
    </EffectPedal>

    <EffectPedal
      name="Delay" type="delay"
      :hasButton="true" :active="effectsActive.delay"
      :controls="[
        { parameter: 'mix',      name: 'Mix',      min: 0,   max: 1,   step: 0.05 },
        { parameter: 'feedback', name: 'Feedback', min: 0,   max: 0.9, step: 0.05 },
        { parameter: 'time',     name: 'Time',     min: 0.1, max: 1,   step: 0.05 }
      ]"
      @changeValue="handleValueChange('delay', $event)"
      @toggleEffect="toggleEffect"
    />

    <EffectPedal
      name="Reverb" type="reverb"
      :hasButton="true" :active="effectsActive.reverb"
      :controls="[
        { parameter: 'mix',   name: 'Mix',   min: 0, max: 1,    step: 0.05 },
        { parameter: 'decay', name: 'Decay', min: 0, max: 0.95, step: 0.05 }
      ]"
      @changeValue="handleValueChange('reverb', $event)"
      @toggleEffect="toggleEffect"
    />

    <div class="pedal controls">
      <button @click="startAudio">Start</button>
    </div>

  </div>
</template>