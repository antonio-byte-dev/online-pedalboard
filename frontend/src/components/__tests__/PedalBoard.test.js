import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import PedalBoard from '../PedalBoard.vue'

// Mock useAudioEngine
const mockEffectsActive = reactive({
  distortion: false,
  delay: false,
  reverb: false
})

const mockEngine = {
  effectsActive:    mockEffectsActive,
  startAudio:       vi.fn(),
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
}

vi.mock('@/composables/useAudioEngine', () => ({
  useAudioEngine: () => mockEngine
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockEffectsActive.distortion = false
  mockEffectsActive.delay      = false
  mockEffectsActive.reverb     = false
})

describe('PedalBoard', () => {

  // --- Rendering ---

  it('renders 4 pedals plus the controls section', () => {
    const wrapper = mount(PedalBoard)
    expect(wrapper.findAll('.pedal')).toHaveLength(5)
  })

  it('renders the Start button', () => {
    const wrapper = mount(PedalBoard)
    const buttons = wrapper.findAll('button')
    const start = buttons.find(b => b.text() === 'Start')
    expect(start).toBeTruthy()
  })

  it('renders the IR file input in the amp pedal', () => {
    const wrapper = mount(PedalBoard)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  // --- startAudio ---

  it('calls startAudio when Start is clicked', async () => {
    const wrapper = mount(PedalBoard)
    const buttons = wrapper.findAll('button')
    const start = buttons.find(b => b.text() === 'Start')
    await start.trigger('click')
    expect(mockEngine.startAudio).toHaveBeenCalledOnce()
  })

  // --- toggleEffect ---

  it('calls toggleEffect with distortion when its ON/OFF is clicked', async () => {
    const wrapper = mount(PedalBoard)
    await wrapper.find('.distortion button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('distortion')
  })

  it('calls toggleEffect with delay when its ON/OFF is clicked', async () => {
    const wrapper = mount(PedalBoard)
    await wrapper.find('.delay button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('delay')
  })

  it('calls toggleEffect with reverb when its ON/OFF is clicked', async () => {
    const wrapper = mount(PedalBoard)
    await wrapper.find('.reverb button').trigger('click')
    expect(mockEngine.toggleEffect).toHaveBeenCalledWith('reverb')
  })

  // --- Active state ---

  it('distortion pedal has on class when effectsActive.distortion is true', async () => {
    mockEffectsActive.distortion = true
    const wrapper = mount(PedalBoard)
    expect(wrapper.find('.distortion').classes()).toContain('on')
  })

  it('delay pedal does not have on class when effectsActive.delay is false', () => {
    const wrapper = mount(PedalBoard)
    expect(wrapper.find('.delay').classes()).not.toContain('on')
  })

  // --- handleValueChange ---

  it('calls setDist when distortion gain slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const slider = wrapper.find('.distortion input[type="range"]')
    await slider.setValue('0.1')
    await slider.trigger('change')
    expect(mockEngine.setDist).toHaveBeenCalledWith('0.1')
  })

  it('calls setDelayMix when delay mix slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[0].setValue('0.5')
    await sliders[0].trigger('change')
    expect(mockEngine.setDelayMix).toHaveBeenCalledWith('0.5')
  })

  it('calls setDelayFeedback when delay feedback slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[1].setValue('0.4')
    await sliders[1].trigger('change')
    expect(mockEngine.setDelayFeedback).toHaveBeenCalledWith('0.4')
  })

  it('calls setDelayTime when delay time slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.delay').findAll('input[type="range"]')
    await sliders[2].setValue('0.6')
    await sliders[2].trigger('change')
    expect(mockEngine.setDelayTime).toHaveBeenCalledWith('0.6')
  })

  it('calls setBass when amp bass slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.amp').findAll('input[type="range"]')
    await sliders[0].setValue('3')
    await sliders[0].trigger('change')
    expect(mockEngine.setBass).toHaveBeenCalledWith('3')
  })

  it('calls setMid when amp mid slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.amp').findAll('input[type="range"]')
    await sliders[1].setValue('2')
    await sliders[1].trigger('change')
    expect(mockEngine.setMid).toHaveBeenCalledWith('2')
  })

  it('calls setTreble when amp treble slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.amp').findAll('input[type="range"]')
    await sliders[2].setValue('-3')
    await sliders[2].trigger('change')
    expect(mockEngine.setTreble).toHaveBeenCalledWith('-3')
  })

  it('calls setReverbMix when reverb mix slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.reverb').findAll('input[type="range"]')
    await sliders[0].setValue('0.3')
    await sliders[0].trigger('change')
    expect(mockEngine.setReverbMix).toHaveBeenCalledWith('0.3')
  })

  it('calls setReverbDecay when reverb decay slider changes', async () => {
    const wrapper = mount(PedalBoard)
    const sliders = wrapper.find('.reverb').findAll('input[type="range"]')
    await sliders[1].setValue('0.7')
    await sliders[1].trigger('change')
    expect(mockEngine.setReverbDecay).toHaveBeenCalledWith('0.7')
  })

  // --- IR upload ---

  it('calls loadCustomIR when a file is uploaded', async () => {
    const wrapper = mount(PedalBoard)
    const file = new File([''], 'cabinet.wav', { type: 'audio/wav' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(mockEngine.loadCustomIR).toHaveBeenCalledWith(file)
  })

})