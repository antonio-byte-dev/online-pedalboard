<script setup>
import { ref, onMounted,onUnmounted} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { useIRLibrary } from '@/composables/useIRLibrary'
import EffectPedal  from '../components/EffectPedal.vue'
import PreampPedal  from '../components/PreampPedal.vue'
import CabinetPedal from '../components/CabinetPedal.vue'

const router = useRouter()
const route  = useRoute()

const {
  effectsActive,
  startAudio,stopAudio,
  toggleEffect,
  loadCustomIR,
  setDist,
  setDelayMix, setDelayFeedback, setDelayTime,
  setReverbMix, setReverbDecay,
  setBass, setMid, setTreble
} = useAudioEngine()

const { getIR, fetchIRArrayBuffer } = useIRLibrary()

const cabinetPedal = ref(null)
const irLoading    = ref(false)
const irLoadError  = ref(null)

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

// — Load IR from file input on CabinetPedal —
function onIRLoad(file) {
  const reader = new FileReader()
  reader.onload = (e) => loadCustomIR(e.target.result)
  reader.readAsArrayBuffer(file)
}

// — Load IR from library by id —
async function loadIRFromLibrary(id) {
  irLoading.value   = true
  irLoadError.value = null
  try {
    const ir     = await getIR(id)
    const buffer = await fetchIRArrayBuffer(ir)
    loadCustomIR(buffer)
    if (cabinetPedal.value) cabinetPedal.value.setIRName(ir.name)
  } catch (e) {
    irLoadError.value = e.message
    console.error('IR load failed:', e)
  } finally {
    irLoading.value = false
  }
}

// — Auto-load IR from ?ir= query param on mount —
onMounted(() => {
  const irId = route.query.ir
  if (irId) loadIRFromLibrary(Number(irId))
})

onUnmounted(() => {
  stopAudio()
})
</script>

<template>
  <div class="pedalboard-view">

    <!-- Nav -->
    <nav class="pb-nav">
      <button class="pb-nav__back" @click="router.push('/dashboard')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
        Dashboard
      </button>
      <span class="pb-nav__title">Pedalboard</span>
      <button class="pb-nav__link" @click="router.push('/library')">
        Browse IRs
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
      </button>
    </nav>

    <!-- IR loading indicator -->
    <div v-if="irLoading" class="pb-ir-status pb-ir-status--loading">
      Loading IR...
    </div>
    <div v-else-if="irLoadError" class="pb-ir-status pb-ir-status--error">
      {{ irLoadError }}
    </div>

    <!-- Centered pedal chain -->
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

      <PreampPedal
        @changeValue="handleValueChange('amp', $event)"
      />

      <CabinetPedal
        ref="cabinetPedal"
        @loadIR="onIRLoad"
      />

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

  </div>
</template>

<style scoped>
.pedalboard-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

/* — Nav — */
.pb-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid var(--border, #2f2f2f);
  flex-shrink: 0;
}

.pb-nav__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-label, #5a5a5a);
}

.pb-nav__back,
.pb-nav__link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-secondary, #8a8a8a);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  transition: color 150ms;
}

.pb-nav__back:hover,
.pb-nav__link:hover {
  color: var(--text-primary, #f2f2f2);
}

/* — IR status bar — */
.pb-ir-status {
  text-align: center;
  padding: 6px;
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pb-ir-status--loading {
  background: rgba(232, 255, 71, 0.06);
  color: #e8ff47;
  animation: blink 1s ease-in-out infinite;
}

.pb-ir-status--error {
  background: rgba(232, 52, 10, 0.08);
  color: #e8340a;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* — Pedalboard — */
.pedalboard {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 32px;
}
</style>