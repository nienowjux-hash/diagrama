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

export function colorForVlan(vlanId: number): string {
  const index = ((vlanId % VLAN_PALETTE.length) + VLAN_PALETTE.length) % VLAN_PALETTE.length
  return VLAN_PALETTE[index]
}
