import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { DeviceNodeData, ConnectionEdgeData } from '@shared/types'
import { layoutDiagram } from './layout'

function device(id: string, overrides: Partial<DeviceNodeData> = {}): Node<DeviceNodeData> {
  const data: DeviceNodeData = {
    id,
    type: 'server',
    label: id,
    position: { x: 0, y: 0 },
    metadata: {},
    ...overrides
  }
  return { id, type: 'device', position: data.position, data }
}

function edge(source: string, target: string): Edge<ConnectionEdgeData> {
  const data: ConnectionEdgeData = { id: `${source}-${target}`, source, target, type: 'ethernet' }
  return { id: data.id, source, target, type: 'connection', data }
}

describe('layoutDiagram', () => {
  it('assigns distinct positions to connected devices', () => {
    const nodes = [device('a'), device('b'), device('c')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const result = layoutDiagram(nodes, edges)
    const positions = result.map((n) => `${n.position.x},${n.position.y}`)
    expect(new Set(positions).size).toBe(3)
  })

  it('keeps data.position in sync with the top-level position', () => {
    const result = layoutDiagram([device('a')], [])
    expect(result[0].data.position).toEqual(result[0].position)
  })

  it('leaves image nodes exactly where the user put them', () => {
    const img = device('img', { type: 'image', position: { x: 500, y: 500 } })
    const result = layoutDiagram([device('a'), img], [])
    const imgResult = result.find((n) => n.id === 'img')!
    expect(imgResult.position).toEqual({ x: 500, y: 500 })
  })

  it('leaves group frames exactly where the user put them', () => {
    const group = device('g', { type: 'group', position: { x: 300, y: 300 } })
    const result = layoutDiagram([device('a'), group], [])
    const groupResult = result.find((n) => n.id === 'g')!
    expect(groupResult.position).toEqual({ x: 300, y: 300 })
  })

  it('leaves devices parented to a group untouched (their position is relative, not absolute)', () => {
    const child = device('child', { position: { x: 10, y: 10 }, groupId: 'g' })
    const result = layoutDiagram([device('a'), child], [edge('a', 'child')])
    const childResult = result.find((n) => n.id === 'child')!
    expect(childResult.position).toEqual({ x: 10, y: 10 })
  })
})
