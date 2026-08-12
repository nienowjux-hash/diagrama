import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Diagram } from '@shared/types'
import { useDiagramStore } from './diagramStore'

export interface DiagramTab {
  id: string
  name: string
  diagram: Diagram
  dirty: boolean
}

interface TabsState {
  // Full left-to-right tab order, including the active tab's id.
  order: string[]
  // Snapshots for every tab EXCEPT the active one — the active tab's live
  // content lives in useDiagramStore, not here (storing a copy would go
  // stale the instant the user edits anything).
  tabs: Record<string, DiagramTab>
  activeTabId: string
  activeTabName: string

  newTab: () => void
  switchTab: (id: string) => void
  closeTab: (id: string) => void
  renameActiveTab: (name: string) => void
}

const initialId = uuid()

export const useTabsStore = create<TabsState>((set, get) => ({
  order: [initialId],
  tabs: {},
  activeTabId: initialId,
  activeTabName: 'Diagrama 1',

  newTab: () => {
    const state = get()
    const diagramStore = useDiagramStore.getState()
    const newId = uuid()
    const insertAt = state.order.indexOf(state.activeTabId) + 1
    const newOrder = [...state.order]
    newOrder.splice(insertAt, 0, newId)
    set({
      order: newOrder,
      tabs: {
        ...state.tabs,
        [state.activeTabId]: {
          id: state.activeTabId,
          name: state.activeTabName,
          diagram: diagramStore.toDiagram(),
          dirty: diagramStore.dirty
        }
      },
      activeTabId: newId,
      activeTabName: `Diagrama ${state.order.length + 1}`
    })
    diagramStore.newDiagram()
  },

  switchTab: (id) => {
    const state = get()
    if (id === state.activeTabId) return
    const target = state.tabs[id]
    if (!target) return
    const diagramStore = useDiagramStore.getState()
    const newTabs = { ...state.tabs }
    delete newTabs[id]
    newTabs[state.activeTabId] = {
      id: state.activeTabId,
      name: state.activeTabName,
      diagram: diagramStore.toDiagram(),
      dirty: diagramStore.dirty
    }
    set({ tabs: newTabs, activeTabId: id, activeTabName: target.name })
    diagramStore.loadDiagram(target.diagram)
    diagramStore.setDirty(target.dirty)
  },

  closeTab: (id) => {
    const state = get()
    const diagramStore = useDiagramStore.getState()

    // Closing the only remaining tab just clears it, rather than leaving the
    // app with zero tabs open.
    if (state.order.length === 1) {
      diagramStore.newDiagram()
      set({ activeTabName: 'Diagrama 1' })
      return
    }

    const newOrder = state.order.filter((tid) => tid !== id)

    if (id !== state.activeTabId) {
      const newTabs = { ...state.tabs }
      delete newTabs[id]
      set({ order: newOrder, tabs: newTabs })
      return
    }

    const idx = state.order.indexOf(id)
    const neighborId = state.order[idx - 1] ?? newOrder[0]
    const neighbor = state.tabs[neighborId]
    const newTabs = { ...state.tabs }
    delete newTabs[id]
    delete newTabs[neighborId]
    set({
      order: newOrder,
      tabs: newTabs,
      activeTabId: neighborId,
      activeTabName: neighbor?.name ?? 'Diagrama'
    })
    if (neighbor) {
      diagramStore.loadDiagram(neighbor.diagram)
      diagramStore.setDirty(neighbor.dirty)
    }
  },

  renameActiveTab: (name) => set({ activeTabName: name.trim() || get().activeTabName })
}))
