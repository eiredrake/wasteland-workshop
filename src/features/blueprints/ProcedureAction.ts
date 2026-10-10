import type { Blueprint } from './Blueprint'
import type { ActionConfiguration, ActionDefinition } from '../actions/Action'

const procedureHeaders = new Set(['Benediction', 'Procedure', 'Necrology Procedure', 'Dubious Procedure'])
// These procedures explicitly create items, but have no structured crafting recipes.
// Keep them visible; defer queue execution until their inputs and outputs are modeled.
export const pendingProcedureOutputs: Readonly<Record<number, string>> = {
  6219: 'Hypocritical Sample',
  5958: 'Bottled Infection',
  6221: 'Squid Crystal',
}
export function isProcedureBlueprint(blueprint: Blueprint): boolean {
  return procedureHeaders.has(blueprint.metadata?.printHeader?.trim() ?? '')
}
export function canQueueProcedure(blueprint: Blueprint): boolean {
  return isProcedureBlueprint(blueprint) && !pendingProcedureOutputs[blueprint.id] && !blueprint.itemCraftings?.length
}
// Printed effects and consumables remain explicit requirements; this does not
// deduct inventory, apply modifiers to other projects, or fabricate item outputs.
export function procedureAction(blueprint: Blueprint): ActionDefinition {
  if (!canQueueProcedure(blueprint)) throw new Error('This procedure needs its crafting inputs and outputs reviewed before it can be queued.')
  const metadata = blueprint.metadata!
  const duration = metadata.durationOfRoleplay?.trim().match(/^(\d+)\s+minutes?$/i)
  const fixedCost = (resource: string) => Number(metadata.activationRequirement?.trim().match(new RegExp('^(\\d+) ' + resource + '$', 'i'))?.[1] ?? 0)
  const defaults: ActionConfiguration = { mind: fixedCost('Mind'), resolve: fixedCost('Resolve') }
  if (duration && Number(duration[1]) > 0) defaults.minutes = Number(duration[1])
  const modifier = [6119, 5932, 5953, 6223, 5988].includes(blueprint.id)
  return {
    id: 'procedure-' + blueprint.id, version: 2, name: blueprint.name,
    description: metadata.descriptionOfRoleplay ?? '', category: metadata.printHeader?.trim() ?? 'Procedure',
    rules: { source: 'Dystopia Rising blueprint catalog', version: blueprint.updatedAt ?? '', reference: 'Blueprint #' + blueprint.id },
    prerequisites: [metadata.requirementsToUse ?? 'None'], tools: [metadata.equipmentRequiredForUse ?? 'None'], facilities: [metadata.locationOfUse ?? 'Any'], verified: true,
    options: [{ id: 'perform', name: 'Perform procedure', mind: 0, resolve: 0, minutes: 0, defaults,
      requirements: [
        'Confirm totals for this performance using the printed rules, including per-target costs and any additional costs in the mechanics.',
        'Printed duration: ' + (metadata.durationOfRoleplay ?? 'See mechanics'),
        'Activation: ' + (metadata.activationRequirement ?? 'See mechanics'),
        'Targets: ' + (metadata.validTargetDescription ?? 'See mechanics'),
        'Equipment / consumables: ' + (metadata.equipmentRequiredForUse ?? 'None'),
        ...(modifier ? ['This procedure modifies another activity. Record its full duration and applicable costs here; this entry does not automatically change another queued activity or its output.'] : []),
      ],
      inputs: [], equipmentUses: [], outputs: [], effects: [metadata.mechanics, metadata.notes].filter((value): value is string => !!value),
      fields: (['minutes', 'mind', 'resolve'] as const).map(id => ({ id, label: id === 'minutes' ? 'Duration (minutes)' : id === 'mind' ? 'Total Mind' : 'Total Resolve', type: 'quantity' as const, min: id === 'minutes' ? 1 : 0, max: 100000, required: true })),
      adjustments: (['minutes', 'mind', 'resolve'] as const).map(id => ({ field: id, baseline: 0, [id]: 1 })),
    }],
  }
}
