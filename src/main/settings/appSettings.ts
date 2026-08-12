import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppSettings } from '@shared/types'
import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_MODEL } from '@shared/types'

const settingsPath = (): string => join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  ollamaHost: DEFAULT_OLLAMA_HOST,
  ollamaModel: DEFAULT_OLLAMA_MODEL
}

export function getAppSettings(): AppSettings {
  const path = settingsPath()
  if (!existsSync(path)) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'))
    return {
      ollamaHost: typeof parsed.ollamaHost === 'string' ? parsed.ollamaHost : DEFAULT_SETTINGS.ollamaHost,
      ollamaModel: typeof parsed.ollamaModel === 'string' ? parsed.ollamaModel : DEFAULT_SETTINGS.ollamaModel
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function setAppSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getAppSettings()
  const next: AppSettings = { ...current, ...partial }
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2))
  return next
}
