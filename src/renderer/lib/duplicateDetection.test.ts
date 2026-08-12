import { describe, it, expect } from 'vitest'
import type { ExistingDeviceSummary } from '@shared/types'
import { findPotentialDuplicates } from './duplicateDetection'

const existing: ExistingDeviceSummary[] = [
  { id: '1', label: 'Servidor AD', type: 'server' },
  { id: '2', label: 'Switch 24P', type: 'switch' },
  { id: '3', label: 'AP', type: 'ap' }
]

describe('findPotentialDuplicates', () => {
  it('flags an exact (normalized) label + type match', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'servidor ad', type: 'server' }])
    expect(result).toHaveLength(1)
    expect(result[0].existingLabel).toBe('Servidor AD')
  })

  it('flags accent/case-insensitive matches', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'SERVIDOR AD', type: 'server' }])
    expect(result).toHaveLength(1)
  })

  it('flags one label containing the other (min 4 chars)', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'Switch 24P TP-Link', type: 'switch' }])
    expect(result).toHaveLength(1)
  })

  it('does not flag a match across different device types', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'Servidor AD', type: 'client' }])
    expect(result).toHaveLength(0)
  })

  it('does not flag short generic labels under the containment threshold', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'AP2', type: 'ap' }])
    // "AP" (2 chars) is below the 4-char containment floor, so no match.
    expect(result).toHaveLength(0)
  })

  it('does not flag genuinely new devices', () => {
    const result = findPotentialDuplicates(existing, [{ label: 'Impressora', type: 'generic' }])
    expect(result).toHaveLength(0)
  })
})
