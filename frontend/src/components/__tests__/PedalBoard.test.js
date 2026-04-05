import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import PedalBoard from '../../views/PedalBoard.vue'

// Mock useAudioEngine
const mockEffectsActive = reactive({
  distortion: false,
  delay: false,
  reverb: false
})

const mockEngine = {
  effectsActive:    mockEffectsActive,
  startAudio:       vi.fn(),
  stopAudio:        vi.fn(),
  toggleEffect:     vi.fn(),
  loadCustomIR:     vi.fn(),
  setDist:          vi.fn(),
  setDelayMix:      vi.fn(),
  setDelayFeedback: vi.fn(),
  setDelayTime:     vi.fn(),
  setReverbMix:     vi.fn(),
  setReverbDecay:   vi.fn(),
  setBass:          vi.fn(),
  setMid:           vi.fn(),
  setTreble:        vi.fn(),
  close:            vi.fn(),
}

vi.mock('@/composables/useAudioEngine', () => ({
  useAudioEngine: () => mockEngine
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute:  () => ({ query: {} }),  // ← empty query, no IR to load
}))

vi.mock('@/composables/useAudioEngine', () => ({
  useAudioEngine: () => mockEngine
}))

vi.mock('@/composables/useIRLibrary', () => ({
  useIRLibrary: () => ({
    getIR:             vi.fn(),
    fetchIRArrayBuffer: vi.fn(),
  })
}))

function mountPedalBoard() {
  return mount(PedalBoard, {
    global: {
      stubs: {
        PreampPedal:  { template: '<div class="pedal amp"></div>' },
        CabinetPedal: {
          template: '<div class="pedal cabinet"><input type="file" /></div>',
          methods: { setIRName: vi.fn() }
        },
      }
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEffectsActive.distortion = false
  mockEffectsActive.delay      = false
  mockEffectsActive.reverb     = false

})

describe('PedalBoard', () => {

  // --- Rendering ---

  it('renders 5 pedals plus the controls section', () => {
    const wrapper = mountPedalBoard()
    expect(wrapper.findAll('.pedal')).toHaveLength(6)
  })

  it('renders the Start button', () => {
    const wrapper = mountPedalBoard()
    const buttons = wrapper.findAll('button')
    const start = buttons.find(b => b.text() === 'Start')
    expect(start).toBeTruthy()
  })

  it('renders the IR file input in the amp pedal', () => {
    const wrapper = mountPedalBoard()
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  // --- startAudio ---

  it('calls startAudio when Start is clicked', async () => {
    const wrapper = mountPedalBoard()
    const buttons = wrapper.findAll('button')
    const start = buttons.find(b => b.text() === 'Start')
    await start.trigger('click')
    expect(mockEngine.startAudio).toHaveBeenCalledOnce()
  })
  // --- stopAudio on unmount ---

  it('calls stopAudio when component is unmounted', () => {
    const wrapper = mountPedalBoard()
    wrapper.unmount()
    expect(mockEngine.stopAudio).toHaveBeenCalledOnce()
  })

  // --- toggleEffect ---

  it('calls toggleEffect with distortion when its ON/OFF is clicked', async () => {
    const wrapper = mountPedalBoard()
    await wrapper.find('.distortion button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('distortion')
  })

  it('calls toggleEffect with delay when its ON/OFF is clicked', async () => {
    const wrapper = mountPedalBoard()
    await wrapper.find('.delay button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('delay')
  })

  it('calls toggleEffect with reverb when its ON/OFF is clicked', async () => {
    const wrapper = mountPedalBoard()
    await wrapper.find('.reverb button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('reverb')
  })

  // --- Active state ---

  it('distortion pedal has on class when effectsActive.distortion is true', async () => {
    mockEffectsActive.distortion = true
    const wrapper = mountPedalBoard()
    expect(wrapper.find('.distortion').classes()).toContain('on')
  })

  it('delay pedal does not have on class when effectsActive.delay is false', () => {
    const wrapper = mountPedalBoard()
    expect(wrapper.find('.delay').classes()).not.toContain('on')
  })

  // --- handleValueChange ---

  it('calls setDist when distortion gain slider changes', async () => {
    const wrapper = mountPedalBoard()
    const slider = wrapper.find('.distortion input[type="range"]')
    await slider.setValue('0.1')
    await slider.trigger('change')
    expect(mockEngine.setDist).toHaveBeenCalledWith('0.1')
  })

  it('calls setDelayMix when delay mix slider changes', async () => {
    const wrapper = mountPedalBoard()
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[0].setValue('0.5')
    await sliders[0].trigger('change')
    expect(mockEngine.setDelayMix).toHaveBeenCalledWith('0.5')
  })

  it('calls setDelayFeedback when delay feedback slider changes', async () => {
    const wrapper = mountPedalBoard()
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[1].setValue('0.4')
    await sliders[1].trigger('change')
    expect(mockEngine.setDelayFeedback).toHaveBeenCalledWith('0.4')
  })

  it('calls setDelayTime when delay time slider changes', async () => {
    const wrapper = mountPedalBoard()
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[2].setValue('0.6')
    await sliders[2].trigger('change')
    expect(mockEngine.setDelayTime).toHaveBeenCalledWith('0.6')
  })

  

  it('calls setReverbMix when reverb mix slider changes', async () => {
    const wrapper = mountPedalBoard()
    const sliders = wrapper.find('.reverb').findAll('input[type="range"]')
    await sliders[0].setValue('0.3')
    await sliders[0].trigger('change')
    expect(mockEngine.setReverbMix).toHaveBeenCalledWith('0.3')
  })

  it('calls setReverbDecay when reverb decay slider changes', async () => {
    const wrapper = mountPedalBoard()
    const sliders = wrapper.find('.reverb').findAll('input[type="range"]')
    await sliders[1].setValue('0.7')
    await sliders[1].trigger('change')
    expect(mockEngine.setReverbDecay).toHaveBeenCalledWith('0.7')
  })



})