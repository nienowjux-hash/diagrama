/// <reference types="vite/client" />

import type { DiagramAPI } from '@shared/ipc'

declare global {
  interface Window {
    diagramAPI: DiagramAPI
  }
}
