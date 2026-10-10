import type { Blueprint } from './Blueprint'
import type { ActionDefinition } from '../actions/Action'
export function isProcedureBlueprint(blueprint: Blueprint): boolean {
  return blueprint.metadata?.printHeader === 'Benediction' || blueprint.id === 5459
}
// Printed procedures have effects, not manufactured inventory outputs.
export function procedureAction(blueprint: Blueprint): ActionDefinition {
  if (!isProcedureBlueprint(blueprint)) throw new Error('This print is not a supported procedure.')
  const metadata = blueprint.metadata!
  const minutes = Number(metadata.durationOfRoleplay?.match(/\d+/)?.[0] ?? 0)
  const fixedCost = (resource: string) => Number(metadata.activationRequirement?.match(new RegExp('^(\\d+) ' + resource + '$'))?.[1] ?? 0)
  const values = { minutes, mind: fixedCost('Mind'), resolve: fixedCost('Resolve') }
  return {
    id: 'procedure-' + blueprint.id, version: 1, name: blueprint.name,
    description: metadata.descriptionOfRoleplay ?? '', category: metadata.printHeader ?? 'Procedure',
    rules: { source: 'Dystopia Rising blueprint catalog', version: blueprint.updatedAt ?? '', reference: 'Blueprint #' + blueprint.id },
    prerequisites: [metadata.requirementsToUse ?? 'None'], tools: [metadata.equipmentRequiredForUse ?? 'None'], facilities: [metadata.locationOfUse ?? 'Any'], verified: true,
    options: [{ id: 'perform', name: 'Perform procedure', mind: 0, resolve: 0, minutes: 0, defaults: values,
      requirements: ['Confirm totals for this performance using the printed rules, including per-target costs and any additional costs in the mechanics.', 'Printed duration: ' + metadata.durationOfRoleplay, 'Activation: ' + metadata.activationRequirement, 'Targets: ' + metadata.validTargetDescription],
      inputs: [], equipmentUses: [], outputs: [], effects: [metadata.mechanics, metadata.notes].filter((value): value is string => !!value),
      fields: (['minutes', 'mind', 'resolve'] as const).map(id => ({ id, label: id === 'minutes' ? 'Duration (minutes)' : id === 'mind' ? 'Total Mind' : 'Total Resolve', type: 'quantity' as const, min: id === 'minutes' ? 1 : 0, max: 100000, required: true })),
      adjustments: (['minutes', 'mind', 'resolve'] as const).map(id => ({ field: id, baseline: 0, [id]: 1 })),
    }],
  }
}
