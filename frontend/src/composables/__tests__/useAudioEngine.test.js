import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- WebAudio API mocks ---

const mockParam = { value: 0 }

const mockPreWorklet = {
  connect: vi.fn(),
  port: { postMessage: vi.fn() },
  parameters: { get: vi.fn(() => mockParam) }
}

const mockPostWorklet = {
  connect: vi.fn(),
  port: { postMessage: vi.fn() },
  parameters: { get: vi.fn(() => mockParam) }
}

let workletCallCount = 0

globalThis.AudioWorkletNode = function() {
  workletCallCount++
  return workletCallCount === 1 ? mockPreWorklet : mockPostWorklet
}
const mockAudioContext = {
  resume:          vi.fn().mockResolvedValue(undefined),
  decodeAudioData: vi.fn().mockResolvedValue({
    length: 100,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(100)
  }),
  createConvolver: vi.fn(() => ({
    connect: vi.fn(),
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    buffer: null
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers'
  })),
  createBuffer: vi.fn(() => ({
    getChannelData: () => new Float32Array(100)
  })),
  createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
  sampleRate: 44100,
  destination: {},
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(undefined)
  }
}

globalThis.AudioContext = function () { return mockAudioContext }
globalThis.window = {
  AudioContext: globalThis.AudioContext,
  webkitAudioContext: globalThis.AudioContext
}

globalThis.fetch = vi.fn(() => Promise.resolve({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
}))

globalThis.navigator = {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({ id: 'mock-stream' })
  }
}

// ---

import { useAudioEngine } from '../useAudioEngine'

beforeEach(() => {
  vi.clearAllMocks()
  workletCallCount = 0
  mockParam.value = 0
  mockAudioContext.resume.mockResolvedValue(undefined)
  mockAudioContext.audioWorklet.addModule.mockResolvedValue(undefined)
  mockAudioContext.decodeAudioData.mockResolvedValue({
    length: 100,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(100)
  })
  mockAudioContext.createConvolver.mockReturnValue({
    connect: vi.fn(),
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    buffer: null
  })
  mockAudioContext.createGain.mockReturnValue({
    connect: vi.fn(),
    gain: { value: 1 },
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers'
  })
  mockAudioContext.createBuffer.mockReturnValue({
    getChannelData: () => new Float32Array(100)
  })
  mockAudioContext.createMediaStreamSource.mockReturnValue({ connect: vi.fn() })
  mockPreWorklet.connect.mockReset()
  mockPreWorklet.port.postMessage.mockReset()
  mockPreWorklet.parameters.get.mockReset().mockReturnValue(mockParam)
  mockPostWorklet.connect.mockReset()
  mockPostWorklet.port.postMessage.mockReset()
  mockPostWorklet.parameters.get.mockReset().mockReturnValue(mockParam)
  globalThis.fetch.mockReturnValue(Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
  }))
  globalThis.navigator.mediaDevices.getUserMedia.mockResolvedValue({ id: 'mock-stream' })
})

describe('useAudioEngine', () => {

  // --- Initial state ---

  it('micReady starts as false', () => {
    const { micReady } = useAudioEngine()
    expect(micReady.value).toBe(false)
  })

  it('all effects start as inactive', () => {
    const { effectsActive } = useAudioEngine()
    expect(effectsActive.distortion).toBe(false)
    expect(effectsActive.delay).toBe(false)
    expect(effectsActive.reverb).toBe(false)
  })

  // --- startAudio ---

  it('sets micReady to true after startAudio', async () => {
    const { micReady, startAudio } = useAudioEngine()
    await startAudio()
    expect(micReady.value).toBe(true)
  })

  it('does not initialize twice if called again', async () => {
    const { startAudio } = useAudioEngine()
    await startAudio()
    await startAudio()
    expect(mockAudioContext.resume).toHaveBeenCalledTimes(1)
  })

  it('requests microphone access', async () => {
    const { startAudio } = useAudioEngine()
    await startAudio()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        })
      })
    )
  })

  it('loads the worklet modules', async () => {
    const { startAudio } = useAudioEngine()
    await startAudio()
    expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith('/worklets/pre-cabinet-processor.js')
    expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith('/worklets/post-cabinet-processor.js')
  })

  it('loads the cabinet IR', async () => {
    const { startAudio } = useAudioEngine()
    await startAudio()
    expect(fetch).toHaveBeenCalledWith('/ir/default.wav')
  })

  // --- toggleEffect ---

  it('toggleEffect flips distortion state', async () => {
    const { effectsActive, toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    expect(effectsActive.distortion).toBe(false)
    toggleEffect('distortion')
    expect(effectsActive.distortion).toBe(true)
    toggleEffect('distortion')
    expect(effectsActive.distortion).toBe(false)
  })

  it('toggleEffect flips delay state', async () => {
    const { effectsActive, toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    toggleEffect('delay')
    expect(effectsActive.delay).toBe(true)
  })

  it('toggleEffect flips reverb state', async () => {
    const { effectsActive, toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    toggleEffect('reverb')
    expect(effectsActive.reverb).toBe(true)
  })

  it('toggleEffect sends distortion amount to pre worklet', async () => {
    const { toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    toggleEffect('distortion')
    expect(mockPreWorklet.parameters.get).toHaveBeenCalledWith('distAmount')
  })

  it('toggleEffect sends delay mix to post worklet port', async () => {
    const { toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    toggleEffect('delay')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ delayMix: 0.5 })
    )
  })

  it('toggleEffect sends reverb mix to post worklet port', async () => {
    const { toggleEffect, startAudio } = useAudioEngine()
    await startAudio()
    toggleEffect('reverb')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reverbMix: 0.5 })
    )
  })

  // --- Setters ---

  it('setDist updates distortion worklet parameter', async () => {
    const { setDist, startAudio } = useAudioEngine()
    await startAudio()
    setDist('0.5')
    expect(mockPreWorklet.parameters.get).toHaveBeenCalledWith('distAmount')
  })

  it('setBass updates bass worklet parameter', async () => {
    const { setBass, startAudio } = useAudioEngine()
    await startAudio()
    setBass('6')
    expect(mockPreWorklet.parameters.get).toHaveBeenCalledWith('bass')
  })

  it('setMid updates mid worklet parameter', async () => {
    const { setMid, startAudio } = useAudioEngine()
    await startAudio()
    setMid('3')
    expect(mockPreWorklet.parameters.get).toHaveBeenCalledWith('mid')
  })

  it('setTreble updates treble worklet parameter', async () => {
    const { setTreble, startAudio } = useAudioEngine()
    await startAudio()
    setTreble('-3')
    expect(mockPreWorklet.parameters.get).toHaveBeenCalledWith('treble')
  })

  it('setDelayMix sends message to post worklet port', async () => {
    const { setDelayMix, startAudio } = useAudioEngine()
    await startAudio()
    setDelayMix('0.7')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith({ delayMix: 0.7 })
  })

  it('setDelayFeedback sends message to post worklet port', async () => {
    const { setDelayFeedback, startAudio } = useAudioEngine()
    await startAudio()
    setDelayFeedback('0.6')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith({ delayFeedback: 0.6 })
  })

  it('setDelayTime sends message to post worklet port', async () => {
    const { setDelayTime, startAudio } = useAudioEngine()
    await startAudio()
    setDelayTime('0.4')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith({ delayTime: 0.4 })
  })

  it('setReverbMix sends message to post worklet port', async () => {
    const { setReverbMix, startAudio } = useAudioEngine()
    await startAudio()
    setReverbMix('0.3')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith({ reverbMix: 0.3 })
  })

  it('setReverbDecay sends message to post worklet port', async () => {
    const { setReverbDecay, startAudio } = useAudioEngine()
    await startAudio()
    setReverbDecay('0.8')
    expect(mockPostWorklet.port.postMessage).toHaveBeenCalledWith({ reverbDecay: 0.8 })
  })

  // --- loadCustomIR ---

  it('loadCustomIR decodes the file and sets it on the convolver', async () => {
    const { loadCustomIR, startAudio } = useAudioEngine()
    await startAudio()
    const mockFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
    }
    await loadCustomIR(mockFile)
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled()
  })

})