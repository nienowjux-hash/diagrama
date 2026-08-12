import { describe, it, expect } from 'vitest'
import { colorForVlan } from './vlanColors'

describe('colorForVlan', () => {
  it('is deterministic for the same id', () => {
    expect(colorForVlan(10)).toBe(colorForVlan(10))
  })

  it('returns a valid hex color', () => {
    expect(colorForVlan(1)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('handles negative ids without throwing or returning undefined', () => {
    expect(colorForVlan(-5)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('wraps around the palette for ids beyond its length', () => {
    expect(colorForVlan(0)).toBe(colorForVlan(10))
  })
})
