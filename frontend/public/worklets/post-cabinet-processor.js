/* global AudioWorkletProcessor, sampleRate, registerProcessor */
class PostCabinetProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    this.sr = sampleRate

    // Delay
    const maxDelaySamples = this.sr * 2
    this.delayBuffer      = new Float32Array(maxDelaySamples)
    this.delayWrite       = 0
    this.delayTimeSamples = Math.floor(0.3 * this.sr)
    this.delayFeedback    = 0.4
    this.delayMix         = 0.0

    // Plate reverb
    this.reverbMix    = 0.0
    this.reverbDecay  = 0.5
    this.delayLengths = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116]
    this.reverbBuffers = this.delayLengths.map(len => new Float32Array(len))
    this.reverbIndices = new Int32Array(this.delayLengths.length)

    // Smoothed parameter values (prevents clicks when changing parameters)
    this.smoothDelayMix      = 0.0
    this.smoothDelayFeedback = 0.4
    this.smoothReverbMix     = 0.0
    this.smoothReverbDecay   = 0.5

    // Smoothing coefficient (closer to 1 = slower response)
    this.smooth = 0.995

    this.port.onmessage = (e) => {
      if (e.data.delayTime     !== undefined) this.delayTimeSamples = Math.floor(e.data.delayTime * this.sr)
      if (e.data.delayFeedback !== undefined) this.delayFeedback    = e.data.delayFeedback
      if (e.data.delayMix      !== undefined) this.delayMix         = e.data.delayMix
      if (e.data.reverbMix     !== undefined) this.reverbMix        = e.data.reverbMix
      if (e.data.reverbDecay   !== undefined) this.reverbDecay      = e.data.reverbDecay
    }
  }

  processDelay(dry) {
    // Interpolate parameters to avoid clicks
    this.smoothDelayMix      = this.smooth * this.smoothDelayMix      + (1 - this.smooth) * this.delayMix
    this.smoothDelayFeedback = this.smooth * this.smoothDelayFeedback + (1 - this.smooth) * this.delayFeedback

    const readIdx = (this.delayWrite - this.delayTimeSamples + this.delayBuffer.length) % this.delayBuffer.length
    const delayed = this.delayBuffer[readIdx]

    // Soft clip before writing to buffer to prevent signal accumulation
    this.delayBuffer[this.delayWrite] = Math.tanh(dry + delayed * this.smoothDelayFeedback)
    this.delayWrite = (this.delayWrite + 1) % this.delayBuffer.length

    return dry * (1 - this.smoothDelayMix) + delayed * this.smoothDelayMix
  }

  processReverb(dry) {
    // Interpolate parameters to avoid clicks
    this.smoothReverbMix   = this.smooth * this.smoothReverbMix   + (1 - this.smooth) * this.reverbMix
    this.smoothReverbDecay = this.smooth * this.smoothReverbDecay + (1 - this.smooth) * this.reverbDecay

    const d = this.reverbBuffers.map((buf, i) => buf[this.reverbIndices[i]])

    // Hadamard mix matrix for cross-feedback
    const wet = [
      d[0] + d[1] - d[2] - d[3],
      d[0] - d[1] + d[2] - d[3],
      d[0] - d[1] - d[2] + d[3],
      d[0] + d[1] + d[2] + d[3]
    ]

    for (let j = 0; j < this.delayLengths.length; j++) {
      this.reverbBuffers[j][this.reverbIndices[j]] = dry * 0.5 + wet[j % 4] * this.smoothReverbDecay * 0.25
      this.reverbIndices[j] = (this.reverbIndices[j] + 1) % this.delayLengths[j]
    }

    const wetOut = (wet[0] + wet[1] + wet[2] + wet[3]) * 0.25
    return dry * (1 - this.smoothReverbMix) + wetOut * this.smoothReverbMix
  }

  process(inputs, outputs) {
    const input  = inputs[0]
    const output = outputs[0]

    // Mix stereo input channels to mono before processing
    const inL = (input && input[0]) ? input[0] : new Float32Array(128)
    const inR = (input && input[1]) ? input[1] : inL

    const outL = output[0]
    const outR = output[1]

    for (let i = 0; i < outL.length; i++) {
      let s = (inL[i] + inR[i]) * 0.5
      s = this.processDelay(s)
      s = this.processReverb(s)
      // Duplicate processed signal to both output channels
      outL[i] = s
      outR[i] = s
    }

    return true
  }
}

registerProcessor('post-cabinet-processor', PostCabinetProcessor)