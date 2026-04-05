import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EffectPedal from '../EffectPedal.vue'

const baseControls = [
  { parameter: 'gain', name: 'Gain', min: 0, max: 1, step: 0.01 }
]

describe('EffectPedal', () => {

  // --- Rendering ---

  it('displays the pedal name', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Distortion', type: 'distortion', controls: baseControls }
    })
    expect(wrapper.find('h3').text()).toBe('Distortion')
  })

  it('applies the type class', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Delay', type: 'delay', controls: [] }
    })
    expect(wrapper.find('.pedal').classes()).toContain('delay')
  })

  it('applies the on class when active is true', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Reverb', type: 'reverb', active: true, controls: [] }
    })
    expect(wrapper.find('.pedal').classes()).toContain('on')
  })

  it('does not apply the on class when active is false', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Reverb', type: 'reverb', active: false, controls: [] }
    })
    expect(wrapper.find('.pedal').classes()).not.toContain('on')
  })

  // --- Controls ---

  it('renders one slider per control', () => {
    const controls = [
      { parameter: 'mix',      name: 'Mix',      min: 0, max: 1,   step: 0.05 },
      { parameter: 'feedback', name: 'Feedback', min: 0, max: 0.9, step: 0.05 },
      { parameter: 'time',     name: 'Time',     min: 0, max: 1,   step: 0.05 }
    ]
    const wrapper = mount(EffectPedal, {
      props: { name: 'Delay', type: 'delay', controls }
    })
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(3)
  })

  it('slider starts at the midpoint between min and max', () => {
    const wrapper = mount(EffectPedal, {
      props: {
        name: 'Distortion', type: 'distortion',
        controls: [{ parameter: 'gain', name: 'Gain', min: 0, max: 0.5, step: 0.01 }]
      }
    })
    const slider = wrapper.find('input[type="range"]')
    expect(Number(slider.element.value)).toBe(0.25)
  })

  it('slider has correct min, max and step attributes', () => {
    const wrapper = mount(EffectPedal, {
      props: {
        name: 'Amp', type: 'amp',
        controls: [{ parameter: 'frequency', name: 'Tone', min: 200, max: 2000, step: 50 }]
      }
    })
    const slider = wrapper.find('input[type="range"]')
    expect(Number(slider.attributes('min'))).toBe(200)
    expect(Number(slider.attributes('max'))).toBe(2000)
    expect(Number(slider.attributes('step'))).toBe(50)
  })

  // --- ON/OFF button ---

  it('shows the ON/OFF button when hasButton is true', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Distortion', type: 'distortion', hasButton: true, controls: [] }
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('does not show the ON/OFF button when hasButton is false', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Amp', type: 'amp', hasButton: false, controls: [] }
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  // --- Events ---

  it('emits toggleEffect with the type when ON/OFF is clicked', async () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Delay', type: 'delay', hasButton: true, controls: [] }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggleEffect')?.[0]).toEqual(['delay'])
  })

  it('emits changeValue with parameter and value when slider changes', async () => {
    const wrapper = mount(EffectPedal, {
      props: {
        name: 'Distortion', type: 'distortion',
        controls: [{ parameter: 'gain', name: 'Gain', min: 0, max: 0.2, step: 0.01 }]
      }
    })
    const slider = wrapper.find('input[type="range"]')
    await slider.setValue('0.15')
    await slider.trigger('change')
    const emitted = wrapper.emitted('changeValue')?.[0]?.[0]
    expect(emitted).toEqual({ parameter: 'gain', value: '0.15' })
  })

  // --- Extra slot ---

  it('renders content in the extra slot', () => {
    const wrapper = mount(EffectPedal, {
      props: { name: 'Amp', type: 'amp', controls: [] },
      slots: { extra: '<input type="file" />' }
    })
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

})