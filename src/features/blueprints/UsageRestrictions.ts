import type { Blueprint } from './Blueprint'
import { blueprintUsageRequirements } from './BlueprintSearchMatch'
export type UsageRestriction = { type: 'Lineage' | 'Strain'; value: string; source: string }
const lineageNames = new Set(['gorger','devoted','townie','nomad','evolved','elitariat','mutant','landsman'])
// Recognize explicit restrictions, not incidental lineage mentions in mechanics/lore.
export function blueprintUsageRestrictions(blueprint: Blueprint): UsageRestriction[] {
  const restrictions: UsageRestriction[] = []
  for (const source of blueprintUsageRequirements(blueprint)) {
    for (const clause of source.split(/[;\n]+/).map(value => value.trim().replace(/\.$/,''))) {
      const lineage = clause.match(/^([A-Za-z][A-Za-z '-]*?)\s+Lineage$/i)
      const strain = clause.match(/^Strain\s*:\s*([A-Za-z][A-Za-z '-]*)$/i)
      const type = lineage ? 'Lineage' : strain ? 'Strain' : undefined
      const value = (lineage?.[1] ?? strain?.[1])?.trim()
      if (!type || !value || /^(any|all|none)$/i.test(value)) continue
      // Compound conditions that cannot be summarized safely remain in Details.
      if (lineage && !value.toLowerCase().split(/\s+(?:or|and)\s+/).every(name => lineageNames.has(name.trim()))) continue
      if (strain && /\b(not|except|without|cannot|must|requires?)\b/i.test(value)) continue
      if (!restrictions.some(item => item.type === type && item.value.toLowerCase() === value.toLowerCase())) restrictions.push({type,value,source})
    }
  }
  return restrictions
}
