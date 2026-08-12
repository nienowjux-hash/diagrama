/** Mixes a hex color toward white (amount > 0) or black (amount < 0), both in [-1, 1]. */
function mix(hex: string, amount: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return hex
  const [r, g, b] = [match[1], match[2], match[3]].map((h) => parseInt(h, 16))
  const target = amount > 0 ? 255 : 0
  const t = Math.abs(amount)
  const blend = (c: number) => Math.round(c + (target - c) * t)
  return `#${[blend(r), blend(g), blend(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Derives a [light, dark] gradient pair from a single accent color, for custom device colors. */
export function gradientFromColor(hex: string): [string, string] {
  return [mix(hex, 0.32), mix(hex, -0.18)]
}
