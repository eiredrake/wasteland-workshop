import type { Blueprint } from './Blueprint'
export function blueprintUsageRequirements(blueprint: Blueprint): string[] {
  return [
    blueprint.metadata?.requirementsToUse,
    ...(blueprint.itemCraftings ?? []).flatMap(recipe => recipe.craftingFinalProducts.map(product => product.finalProduct.metadata?.requirementsToUse)),
  ].filter((field): field is string => typeof field === 'string' && field.trim() !== '')
}
// Search both the print and its crafted outputs: descriptions belong to the
// output metadata in the catalog, rather than the Blueprint name/columns.
// Special Notes remain visible but are excluded: repeated assistant Mind
// instructions otherwise swamp searches for actual item effects.
function blueprintReferenceFields(blueprint: Blueprint): string[] {
  const outputs = (blueprint.itemCraftings ?? []).flatMap(recipe => recipe.craftingFinalProducts.map(product => product.finalProduct))
  return [blueprint.name, blueprint.kind, ...outputs.flatMap(output => [output.name, output.kind]),
    ...[blueprint.metadata, ...outputs.map(output => output.metadata)].flatMap(metadata => metadata ? [
      metadata.mechanics, metadata.requirementsToUse, metadata.printHeader,
      metadata.descriptionOfRoleplay, metadata.activationRequirement, metadata.validTargetDescription,
    ] : []),
  ].filter((field): field is string => typeof field === 'string' && field.trim() !== '')
}

// OR separates groups; + and - join required/excluded phrases inside a group.
// Quotes protect literal operator characters (for example "box-trap").
function matchesExpression(fields: string[], query: string): boolean {
  if (!query.trim()) return true
  const groups: { text: string; excluded: boolean }[][] = [[]]
  let phrase = '', quoted = false, excluded = false
  const flush = () => {
    const text = phrase.trim().replace(/\s+/g, ' ')
    if (text) groups[groups.length - 1].push({ text, excluded })
    phrase = ''
  }
  for (const character of query.toLowerCase()) {
    if (character === '"') { quoted = !quoted; continue }
    if (!quoted && ['+', '|', '-'].includes(character)) {
      flush()
      if (character === '|') groups.push([])
      excluded = character === '-'
    } else phrase += character
  }
  flush()
  return groups.some(group => group.length > 0 && group.every(term => {
    const found = fields.some(field => field.includes(term.text))
    return term.excluded ? !found : found
  }))
}

// Keep each view's existing columns/status search and share catalog fields.
export function matchesBlueprintSearch(blueprint: Blueprint, query: string, existingFields: string[]): boolean {
  const fields = [...existingFields, ...blueprintReferenceFields(blueprint)]
    .map(field => field.toLowerCase().replace(/\s+/g, ' '))
  return matchesExpression(fields, query)
}
