import { ref, reactive } from 'vue'

export function useAudioEngine() {
  let ctx = null
  let sourceNode = null
  let micStream = null
  let preCabinetWorklet = null
  let postCabinetWorklet = null
  let cabinetConvolver = null
  let masterGain = null

  const micReady = ref(false)
  const effectsActive = reactive({
    distortion: false,
    delay: false,
    reverb: false
  })

  async function loadIRToConvolver(convolver, url) {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      const maxSamples = Math.min(audioBuffer.length, ctx.sampleRate * 0.1)

      // Convert mono IR to stereo by duplicating the channel
      const stereoBuffer = ctx.createBuffer(2, maxSamples, ctx.sampleRate)
      const monoData = audioBuffer.getChannelData(0).subarray(0, maxSamples)
      stereoBuffer.getChannelData(0).set(monoData)
      stereoBuffer.getChannelData(1).set(monoData)

      convolver.buffer = stereoBuffer
    } catch (err) {
      console.error('Error loading IR:', url, err)
    }
  }

  async function buildChain() {
    await ctx.audioWorklet.addModule('/worklets/pre-cabinet-processor.js')
    await ctx.audioWorklet.addModule('/worklets/post-cabinet-processor.js')

    preCabinetWorklet = new AudioWorkletNode(ctx, 'pre-cabinet-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit'
    })

    postCabinetWorklet = new AudioWorkletNode(ctx, 'post-cabinet-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    })

    cabinetConvolver = ctx.createConvolver()
    cabinetConvolver.channelCount = 2
    cabinetConvolver.channelCountMode = 'explicit'
    cabinetConvolver.channelInterpretation = 'speakers'

    masterGain = ctx.createGain()
    masterGain.gain.value = 1.0
    masterGain.channelCount = 2
    masterGain.channelCountMode = 'explicit'
    masterGain.channelInterpretation = 'speakers'

    // Chain: preCabinet → IR → postCabinet → master → destination
    preCabinetWorklet.connect(cabinetConvolver)
    cabinetConvolver.connect(postCabinetWorklet)
    postCabinetWorklet.connect(masterGain)
    masterGain.connect(ctx.destination)

    await loadIRToConvolver(cabinetConvolver, '/ir/default.wav')

    // Apply initial effect states
    preCabinetWorklet.parameters.get('distAmount').value = effectsActive.distortion ? 50 : 0
    postCabinetWorklet.port.postMessage({
      delayMix:      effectsActive.delay  ? 0.5 : 0.0,
      reverbMix:     effectsActive.reverb ? 0.5 : 0.0,
      delayFeedback: 0.4,
      delayTime:     0.3,
      reverbDecay:   0.5
    })
  }

  async function startAudio() {
    if (micReady.value) return

    ctx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 0.01,
      sampleRate: 44100
    })

    await ctx.resume()
    await buildChain()

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latency: 0,
        channelCount: 1
      },
      video: false
    })

    sourceNode = ctx.createMediaStreamSource(micStream)
    sourceNode.connect(preCabinetWorklet)

    micReady.value = true
  }

  function toggleEffect(effectName) {
    effectsActive[effectName] = !effectsActive[effectName]

    switch (effectName) {
      case 'distortion':
        preCabinetWorklet.parameters.get('distAmount').value =
          effectsActive.distortion ? 50 : 0
        break
      case 'delay':
        postCabinetWorklet.port.postMessage({
          delayMix: effectsActive.delay ? 0.5 : 0.0
        })
        break
      case 'reverb':
        postCabinetWorklet.port.postMessage({
          reverbMix: effectsActive.reverb ? 0.5 : 0.0
        })
        break
    }
  }

  async function loadCustomIR(file) {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    cabinetConvolver.buffer = audioBuffer
  }

  function setDist(value) {
    if (preCabinetWorklet)
      preCabinetWorklet.parameters.get('distAmount').value = parseFloat(value) * 500
  }

  function setBass(value) {
    if (preCabinetWorklet)
      preCabinetWorklet.parameters.get('bass').value = parseFloat(value)
  }

  function setMid(value) {
    if (preCabinetWorklet)
      preCabinetWorklet.parameters.get('mid').value = parseFloat(value)
  }

  function setTreble(value) {
    if (preCabinetWorklet)
      preCabinetWorklet.parameters.get('treble').value = parseFloat(value)
  }

  function setDelayMix(value) {
    if (postCabinetWorklet)
      postCabinetWorklet.port.postMessage({ delayMix: parseFloat(value) })
  }

  function setDelayFeedback(value) {
    if (postCabinetWorklet)
      postCabinetWorklet.port.postMessage({ delayFeedback: parseFloat(value) })
  }

  function setDelayTime(value) {
    if (postCabinetWorklet)
      postCabinetWorklet.port.postMessage({ delayTime: parseFloat(value) })
  }

  function setReverbMix(value) {
    if (postCabinetWorklet)
      postCabinetWorklet.port.postMessage({ reverbMix: parseFloat(value) })
  }

  function setReverbDecay(value) {
    if (postCabinetWorklet)
      postCabinetWorklet.port.postMessage({ reverbDecay: parseFloat(value) })
  }

  return {
    micReady,
    effectsActive,
    startAudio,
    toggleEffect,
    loadCustomIR,
    setDist,
    setBass, setMid, setTreble,
    setDelayMix, setDelayFeedback, setDelayTime,
    setReverbMix, setReverbDecay
  }
}