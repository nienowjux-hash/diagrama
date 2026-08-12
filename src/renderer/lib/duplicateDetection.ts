import type { DeviceType, ExistingDeviceSummary } from '@shared/types'

export interface DuplicateWarning {
  generatedLabel: string
  existingLabel: string
  type: DeviceType
}

function normalize(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Heuristic check for devices the LLM likely re-created instead of referencing
 * from the existing-canvas context it was given (a known failure mode of the
 * local model on incremental/additive generation — see CLAUDE.md). Flags a
 * pair when they share a type and their normalized labels match exactly or
 * one fully contains the other (min 4 chars, to avoid noise on short generic
 * labels like "AP" or "PC").
 */
export function findPotentialDuplicates(
  existing: ExistingDeviceSummary[],
  generated: { label: string; type: DeviceType }[]
): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = []
  for (const gen of generated) {
    const genNorm = normalize(gen.label)
    if (!genNorm) continue
    const match = existing.find((ex) => {
      if (ex.type !== gen.type) return false
      const exNorm = normalize(ex.label)
      if (!exNorm) return false
      if (exNorm === genNorm) return true
      const [shorter, longer] = exNorm.length <= genNorm.length ? [exNorm, genNorm] : [genNorm, exNorm]
      return shorter.length >= 4 && longer.includes(shorter)
    })
    if (match) {
      warnings.push({ generatedLabel: gen.label, existingLabel: match.label, type: gen.type })
    }
  }
  return warnings
}
