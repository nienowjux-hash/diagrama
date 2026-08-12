import { useMemo, useState, type MouseEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { useTabsStore } from '../state/tabsStore'
import { useDiagramStore } from '../state/diagramStore'

export default function TabBar() {
  // Select the raw, reference-stable state slices individually and derive the
  // display list with useMemo — selecting `s.tabList()` directly would call a
  // function that builds a brand-new array on every read, which makes
  // zustand's useSyncExternalStore see a "changed" snapshot on every render
  // and re-render forever (crashes the whole tree before it can mount).
  const order = useTabsStore((s) => s.order)
  const tabsById = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const activeTabName = useTabsStore((s) => s.activeTabName)
  const newTab = useTabsStore((s) => s.newTab)
  const switchTab = useTabsStore((s) => s.switchTab)
  const closeTab = useTabsStore((s) => s.closeTab)
  const renameActiveTab = useTabsStore((s) => s.renameActiveTab)
  const activeDirty = useDiagramStore((s) => s.dirty)
  const tabs = useMemo(
    () =>
      order.map((id) =>
        id === activeTabId
          ? { id, name: activeTabName, isActive: true, dirty: activeDirty }
          : { id, name: tabsById[id]?.name ?? 'Diagrama', isActive: false, dirty: tabsById[id]?.dirty ?? false }
      ),
    [order, tabsById, activeTabId, activeTabName, activeDirty]
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditingValue(currentName)
  }

  function commitRename() {
    if (editingId) renameActiveTab(editingValue)
    setEditingId(null)
  }

  function handleClose(e: MouseEvent, id: string, isActive: boolean) {
    e.stopPropagation()
    const isDirty = isActive ? activeDirty : (useTabsStore.getState().tabs[id]?.dirty ?? false)
    if (isDirty && !window.confirm('Fechar esta aba e descartar as alterações não salvas?')) return
    closeTab(id)
  }

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-bar__tab${tab.isActive ? ' tab-bar__tab--active' : ''}`}
          onClick={() => switchTab(tab.id)}
        >
          {editingId === tab.id ? (
            <input
              className="tab-bar__rename-input"
              autoFocus
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="tab-bar__label"
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (tab.isActive) startRename(tab.id, tab.name)
              }}
              title="Duplo clique para renomear"
            >
              {tab.name}
              {tab.dirty && <span className="tab-bar__dirty-dot" title="Alterações não salvas" />}
            </span>
          )}
          <button
            type="button"
            className="tab-bar__close"
            title="Fechar aba"
            onClick={(e) => handleClose(e, tab.id, tab.isActive)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button type="button" className="tab-bar__new" title="Novo diagrama (nova aba)" onClick={newTab}>
        <Plus size={14} />
      </button>
    </div>
  )
}
