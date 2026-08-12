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

  it('gives different colors to common round-number VLAN ids', () => {
    // Regression guard: a plain `vlanId % 10` against a 10-color palette
    // collapsed every multiple of 10 onto the same color — exactly the
    // numbering convention (10/20/30/40...) real networks actually use.
    const colors = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90].map(colorForVlan))
    expect(colors.size).toBeGreaterThan(1)
  })
})
