import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'
export type GridVariant = 'dots' | 'lines' | 'cross' | 'none'

interface UiPreferences {
  theme: ThemePreference
  gridVariant: GridVariant
  gridGap: number
  setTheme: (theme: ThemePreference) => void
  setGridVariant: (variant: GridVariant) => void
  setGridGap: (gap: number) => void
}

const STORAGE_KEY = 'diagrama:uiPreferences'

function loadInitial(): { theme: ThemePreference; gridVariant: GridVariant; gridGap: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw)
    return {
      theme: ['system', 'light', 'dark'].includes(parsed.theme) ? parsed.theme : 'system',
      gridVariant: ['dots', 'lines', 'cross', 'none'].includes(parsed.gridVariant)
        ? parsed.gridVariant
        : 'dots',
      gridGap: typeof parsed.gridGap === 'number' ? parsed.gridGap : 22
    }
  } catch {
    return { theme: 'system', gridVariant: 'dots', gridGap: 22 }
  }
}

function persist(state: { theme: ThemePreference; gridVariant: GridVariant; gridGap: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useUiPreferencesStore = create<UiPreferences>((set, get) => ({
  ...loadInitial(),
  setTheme: (theme) => {
    persist({ theme, gridVariant: get().gridVariant, gridGap: get().gridGap })
    set({ theme })
  },
  setGridVariant: (gridVariant) => {
    persist({ theme: get().theme, gridVariant, gridGap: get().gridGap })
    set({ gridVariant })
  },
  setGridGap: (gridGap) => {
    persist({ theme: get().theme, gridVariant: get().gridVariant, gridGap })
    set({ gridGap })
  }
}))
