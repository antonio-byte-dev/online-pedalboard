import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PreampPedal from '../PreampPedal.vue'

describe('PreampPedal', () => {

  // --- Rendering ---

  it('renders the pedal name', () => {
    const wrapper = mount(PreampPedal)
    expect(wrapper.find('h3').text()).toBe('Preamp')
  })

  it('has pedal, preamp and amp classes', () => {
    const wrapper = mount(PreampPedal)
    expect(wrapper.find('.pedal').classes()).toContain('preamp')
    expect(wrapper.find('.pedal').classes()).toContain('amp')
  })

  it('renders 3 sliders by default', () => {
    const wrapper = mount(PreampPedal)
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(3)
  })

  it('renders labels for bass, mid and treble', () => {
    const wrapper = mount(PreampPedal)
    const labels = wrapper.findAll('label').map(l => l.text())
    expect(labels).toContain('Bass')
    expect(labels).toContain('Mid')
    expect(labels).toContain('Treble')
  })

  // --- Default control values ---

  it('bass slider starts at midpoint (0)', () => {
    const wrapper = mount(PreampPedal)
    const sliders = wrapper.findAll('input[type="range"]')
    expect(Number(sliders[0].element.value)).toBe(0)
  })

  it('mid slider starts at midpoint (0)', () => {
    const wrapper = mount(PreampPedal)
    const sliders = wrapper.findAll('input[type="range"]')
    expect(Number(sliders[1].element.value)).toBe(0)
  })

  it('treble slider starts at midpoint (0)', () => {
    const wrapper = mount(PreampPedal)
    const sliders = wrapper.findAll('input[type="range"]')
    expect(Number(sliders[2].element.value)).toBe(0)
  })

  // --- Slider attributes ---

  it('bass slider has correct min, max and step', () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[0]
    expect(Number(slider.attributes('min'))).toBe(-12)
    expect(Number(slider.attributes('max'))).toBe(12)
    expect(Number(slider.attributes('step'))).toBe(1)
  })

  it('mid slider has correct min, max and step', () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[1]
    expect(Number(slider.attributes('min'))).toBe(-12)
    expect(Number(slider.attributes('max'))).toBe(12)
    expect(Number(slider.attributes('step'))).toBe(1)
  })

  it('treble slider has correct min, max and step', () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[2]
    expect(Number(slider.attributes('min'))).toBe(-12)
    expect(Number(slider.attributes('max'))).toBe(12)
    expect(Number(slider.attributes('step'))).toBe(1)
  })

  // --- Events ---

  it('emits changeValue with bass parameter when bass slider changes', async () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[0]
    await slider.setValue('6')
    await slider.trigger('change')
    expect(wrapper.emitted('changeValue')?.[0]?.[0]).toEqual({ parameter: 'bass', value: '6' })
  })

  it('emits changeValue with mid parameter when mid slider changes', async () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[1]
    await slider.setValue('3')
    await slider.trigger('change')
    expect(wrapper.emitted('changeValue')?.[0]?.[0]).toEqual({ parameter: 'mid', value: '3' })
  })

  it('emits changeValue with treble parameter when treble slider changes', async () => {
    const wrapper = mount(PreampPedal)
    const slider = wrapper.findAll('input[type="range"]')[2]
    await slider.setValue('-6')
    await slider.trigger('change')
    expect(wrapper.emitted('changeValue')?.[0]?.[0]).toEqual({ parameter: 'treble', value: '-6' })
  })

  // --- Custom controls via props ---

  it('renders custom controls when passed as props', () => {
    const controls = [
      { parameter: 'gain', name: 'Gain', min: 0, max: 10, step: 0.5 },
      { parameter: 'tone', name: 'Tone', min: 0, max: 10, step: 0.5 },
    ]
    const wrapper = mount(PreampPedal, { props: { controls } })
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(2)
    const labels = wrapper.findAll('label').map(l => l.text())
    expect(labels).toContain('Gain')
    expect(labels).toContain('Tone')
  })

  it('custom slider starts at correct midpoint', () => {
    const controls = [
      { parameter: 'gain', name: 'Gain', min: 0, max: 10, step: 1 },
    ]
    const wrapper = mount(PreampPedal, { props: { controls } })
    expect(Number(wrapper.find('input[type="range"]').element.value)).toBe(5)
  })

})