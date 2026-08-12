import { useEffect, useRef, useState } from 'react'
import Toolbar from './components/Toolbar'
import TabBar from './components/TabBar'
import DevicePalette from './components/DevicePalette'
import PromptPanel from './components/PromptPanel'
import DiagramCanvas from './components/DiagramCanvas'
import NodePropertiesPanel from './components/NodePropertiesPanel'
import EdgePropertiesPanel from './components/EdgePropertiesPanel'
import BatchEditPanel from './components/BatchEditPanel'
import SettingsModal from './components/SettingsModal'
import { useUiPreferencesStore } from './state/uiPreferencesStore'
import { useDiagramStore } from './state/diagramStore'
import { useTabsStore } from './state/tabsStore'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const theme = useUiPreferencesStore((s) => s.theme)

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    let lastSent = false
    function push() {
      const anyBackgroundTabDirty = Object.values(useTabsStore.getState().tabs).some((t) => t.dirty)
      const hasChanges = useDiagramStore.getState().dirty || anyBackgroundTabDirty
      if (hasChanges !== lastSent) {
        lastSent = hasChanges
        window.diagramAPI.setUnsavedChanges(hasChanges)
      }
    }
    push()
    const unsubDiagram = useDiagramStore.subscribe(push)
    const unsubTabs = useTabsStore.subscribe(push)
    return () => {
      unsubDiagram()
      unsubTabs()
    }
  }, [])

  return (
    <div className="app">
      <Toolbar onOpenSettings={() => setSettingsOpen(true)} canvasRef={canvasRef} />
      <TabBar />
      <div className="app__body">
        <aside className="app__sidebar">
          <PromptPanel onOpenSettings={() => setSettingsOpen(true)} />
          <DevicePalette />
        </aside>
        <main className="app__canvas">
          <DiagramCanvas containerRef={canvasRef} />
        </main>
        <aside className="app__properties">
          <BatchEditPanel />
          <NodePropertiesPanel />
          <EdgePropertiesPanel />
        </aside>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
