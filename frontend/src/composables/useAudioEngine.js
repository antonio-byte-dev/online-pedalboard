/* global Pizzicato */
import { ref, reactive } from 'vue'

export function useAudioEngine() {
  let input = null
  let distortion, delay, reverb, lowPass

  const micReady = ref(false)
  const effectsActive = reactive({
    distortion: true,
    delay: true,
    reverb: true
  })

  function initEffects() {
    distortion = new Pizzicato.Effects.Distortion({ gain: 0.2 })
    delay      = new Pizzicato.Effects.Delay({ feedback: 0.4, time: 0.3, mix: 0.0 })
    reverb     = new Pizzicato.Effects.Reverb({ time: 0.5, decay: 0.4, mix: 0.0 })
    lowPass    = new Pizzicato.Effects.LowPassFilter({ frequency: 800, peak: 1 })
  }

  function startAudio() {
    if (input) return

    if (!Pizzicato.context) {
      Pizzicato.context = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      })
    }

    initEffects()

    Pizzicato.context.resume().then(() => {
      input = new Pizzicato.Sound({ source: 'input' }, () => {
        micReady.value = true

        if (effectsActive.distortion) input.addEffect(distortion)
        input.addEffect(lowPass)
        if (effectsActive.delay)      input.addEffect(delay)
        if (effectsActive.reverb)     input.addEffect(reverb)

        input.play()
      })
    })
  }

  function toggleEffect(effectName) {
    if (!input) return

    effectsActive[effectName] = !effectsActive[effectName]

    if (!micReady.value) return

    const efectos = { distortion, delay, reverb }
    const efecto = efectos[effectName]

    if (effectsActive[effectName]) {
      input.addEffect(efecto)
    } else {
      input.removeEffect(efecto)
    }
  }

  function setDist(value)      { if (distortion) distortion.gain        = parseFloat(value) }
  function setDelayMix(value)  { if (delay)      delay.mix              = parseFloat(value) }
  function setReverbMix(value) { if (reverb)     reverb.mix             = parseFloat(value) }
  function setTone(value)      { if (lowPass)     lowPass.frequency      = parseFloat(value) }

  return {
    micReady,
    effectsActive,
    startAudio,
    toggleEffect,
    setDist,
    setDelayMix,
    setReverbMix,
    setTone
  }
}