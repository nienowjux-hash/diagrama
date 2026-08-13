import { describe, it, expect } from 'vitest'
import { isRealDevice, DECORATIVE_TYPES, type DeviceType } from './types'

const ALL_TYPES: DeviceType[] = [
  'server',
  'nas',
  'firewall',
  'switch',
  'ap',
  'client',
  'cloud',
  'generic',
  'image',
  'group',
  'rectangle',
  'ellipse',
  'line',
  'text'
]

describe('isRealDevice', () => {
  it('treats the 8 LLM-facing types as real devices', () => {
    const networkTypes: DeviceType[] = ['server', 'nas', 'firewall', 'switch', 'ap', 'client', 'cloud', 'generic']
    for (const type of networkTypes) expect(isRealDevice(type)).toBe(true)
  })

  it('treats every decorative type as not a real device', () => {
    for (const type of DECORATIVE_TYPES) expect(isRealDevice(type)).toBe(false)
  })

  it('covers every DeviceType between the two categories with no overlap', () => {
    for (const type of ALL_TYPES) {
      expect(isRealDevice(type)).toBe(!DECORATIVE_TYPES.includes(type))
    }
  })
})
