/* global AudioWorkletProcessor, sampleRate, registerProcessor */
class PreCabinetProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'distAmount', defaultValue: 0,   minValue: 0,   maxValue: 500, automationRate: 'k-rate' },
      { name: 'bass',       defaultValue: 0,   minValue: -12, maxValue: 12,  automationRate: 'k-rate' },
      { name: 'mid',        defaultValue: 0,   minValue: -12, maxValue: 12,  automationRate: 'k-rate' },
      { name: 'treble',     defaultValue: 0,   minValue: -12, maxValue: 12,  automationRate: 'k-rate' },
    ]
  }

  constructor() {
    super()
    this.sr = sampleRate
    this.logged = false

    // Biquad filter state history (L/R channels)
    this.bassStateL   = { x1: 0, x2: 0, y1: 0, y2: 0 }
    this.bassStateR   = { x1: 0, x2: 0, y1: 0, y2: 0 }
    this.midStateL    = { x1: 0, x2: 0, y1: 0, y2: 0 }
    this.midStateR    = { x1: 0, x2: 0, y1: 0, y2: 0 }
    this.trebleStateL = { x1: 0, x2: 0, y1: 0, y2: 0 }
    this.trebleStateR = { x1: 0, x2: 0, y1: 0, y2: 0 }

    this.bassCoeffs   = this.lowShelf(200, 0)
    this.midCoeffs    = this.peaking(1000, 1, 0)
    this.trebleCoeffs = this.highShelf(3000, 0)

    this.prevBass   = 0
    this.prevMid    = 0
    this.prevTreble = 0
    this.prevDist   = 0
  }

  // --- Distortion ---
  distort(x, amount) {
    if (amount === 0) return x
    return ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
  }

  // --- Biquad filters ---
  applyBiquad(x, state, c) {
    const y = c.b0 * x + c.b1 * state.x1 + c.b2 * state.x2
                       - c.a1 * state.y1  - c.a2 * state.y2
    state.x2 = state.x1; state.x1 = x
    state.y2 = state.y1; state.y1 = y
    return y
  }

  lowShelf(freq, gainDb) {
    const A     = Math.pow(10, gainDb / 40)
    const w0    = 2 * Math.PI * freq / this.sr
    const cosW  = Math.cos(w0)
    const sinW  = Math.sin(w0)
    const S     = 1
    const alpha = sinW / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2)
    const b0 =  A * ((A+1) - (A-1)*cosW + 2*Math.sqrt(A)*alpha)
    const b1 =  2*A * ((A-1) - (A+1)*cosW)
    const b2 =  A * ((A+1) - (A-1)*cosW - 2*Math.sqrt(A)*alpha)
    const a0 =  (A+1) + (A-1)*cosW + 2*Math.sqrt(A)*alpha
    const a1 = -2 * ((A-1) + (A+1)*cosW)
    const a2 =  (A+1) + (A-1)*cosW - 2*Math.sqrt(A)*alpha
    return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 }
  }

  highShelf(freq, gainDb) {
    const A     = Math.pow(10, gainDb / 40)
    const w0    = 2 * Math.PI * freq / this.sr
    const cosW  = Math.cos(w0)
    const sinW  = Math.sin(w0)
    const S     = 1
    const alpha = sinW / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2)
    const b0 =  A * ((A+1) + (A-1)*cosW + 2*Math.sqrt(A)*alpha)
    const b1 = -2*A * ((A-1) + (A+1)*cosW)
    const b2 =  A * ((A+1) + (A-1)*cosW - 2*Math.sqrt(A)*alpha)
    const a0 =  (A+1) - (A-1)*cosW + 2*Math.sqrt(A)*alpha
    const a1 =  2 * ((A-1) - (A+1)*cosW)
    const a2 =  (A+1) - (A-1)*cosW - 2*Math.sqrt(A)*alpha
    return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 }
  }

  peaking(freq, Q, gainDb) {
    const A     = Math.pow(10, gainDb / 40)
    const w0    = 2 * Math.PI * freq / this.sr
    const alpha = Math.sin(w0) / (2 * Q)
    const cosW  = Math.cos(w0)
    const b0 =  1 + alpha * A
    const b1 = -2 * cosW
    const b2 =  1 - alpha * A
    const a0 =  1 + alpha / A
    const a1 = -2 * cosW
    const a2 =  1 - alpha / A
    return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 }
  }

  process(inputs, outputs, parameters) {
    const input  = inputs[0]
    const output = outputs[0]

    // Process in mono using the first available channel
    const inp = (input && input.length > 0) ? input[0] : new Float32Array(128)

    const distAmount = parameters.distAmount[0]
    const bass       = parameters.bass[0]
    const mid        = parameters.mid[0]
    const treble     = parameters.treble[0]

    // Recalculate filter coefficients only when parameters change
    if (bass   !== this.prevBass)   { this.bassCoeffs   = this.lowShelf(200, bass);     this.prevBass   = bass   }
    if (mid    !== this.prevMid)    { this.midCoeffs    = this.peaking(1000, 1, mid);   this.prevMid    = mid    }
    if (treble !== this.prevTreble) { this.trebleCoeffs = this.highShelf(3000, treble); this.prevTreble = treble }

    const processed = new Float32Array(inp.length)
    for (let i = 0; i < inp.length; i++) {
      let s = inp[i]
      s = this.distort(s, distAmount)
      s = this.applyBiquad(s, this.bassStateL,   this.bassCoeffs)
      s = this.applyBiquad(s, this.midStateL,    this.midCoeffs)
      s = this.applyBiquad(s, this.trebleStateL, this.trebleCoeffs)
      processed[i] = s
    }

    // Duplicate processed signal to both output channels
    if (output[0]) output[0].set(processed)
    if (output[1]) output[1].set(processed)

    return true
  }
}

registerProcessor('pre-cabinet-processor', PreCabinetProcessor)