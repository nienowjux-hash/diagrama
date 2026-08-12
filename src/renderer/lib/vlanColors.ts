const VLAN_PALETTE = [
  '#e11d48', // rose
  '#f59e0b', // amber
  '#16a34a', // green
  '#0284c7', // sky
  '#7c3aed', // violet
  '#db2777', // pink
  '#0d9488', // teal
  '#ca8a04', // yellow
  '#4f46e5', // indigo
  '#65a30d' // lime
]

export const NEUTRAL_EDGE_COLOR = '#94a3b8'
export const VPN_EDGE_COLOR = '#7c3aed'
export const TRUNK_EDGE_COLOR = '#818cf8'
export const WIRELESS_EDGE_COLOR = '#38bdf8'

/**
 * Multiplicative hash (Murmur3-style finalizer) so the palette index doesn't
 * track the input's base-10 digits directly. A plain `vlanId % length` looks
 * fine until you remember real-world VLAN numbering is almost always round
 * multiples of 10 (10/20/30/40...) — with a 10-color palette that collapsed
 * every single one of them onto the exact same color (index 0), the one
 * case the whole feature exists for.
 */
function hashVlanId(vlanId: number): number {
  let h = vlanId | 0
  h = Math.imul(h ^ (h >>> 16), 2654435761)
  h = Math.imul(h ^ (h >>> 13), 2246822519)
  h ^= h >>> 16
  return h >>> 0
}

export function colorForVlan(vlanId: number): string {
  return VLAN_PALETTE[hashVlanId(vlanId) % VLAN_PALETTE.length]
}
