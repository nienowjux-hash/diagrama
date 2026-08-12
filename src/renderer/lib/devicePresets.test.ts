import { describe, it, expect } from 'vitest'
import { DEVICE_PRESETS, presetColor, presetIcon } from './devicePresets'
import { DEVICE_ICONS } from './deviceIcons'
import { deviceTypeConfig } from './deviceTypeConfig'

describe('DEVICE_PRESETS', () => {
  it('has a unique key per preset', () => {
    const keys = DEVICE_PRESETS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every preset iconKey resolves to a real icon in the registry', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(DEVICE_ICONS[preset.iconKey], `missing icon for preset "${preset.key}"`).toBeDefined()
    }
  })

  it('every preset type has a corresponding deviceTypeConfig entry', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(deviceTypeConfig[preset.type], `missing config for type "${preset.type}"`).toBeDefined()
    }
  })

  it('presetColor/presetIcon never throw for any preset', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(() => presetColor(preset)).not.toThrow()
      expect(() => presetIcon(preset)).not.toThrow()
    }
  })
})
