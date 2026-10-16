import { requireBatchQuantity } from '../batch/BatchQuantity'
import { enqueueBlueprintBuild } from './BuildQueueService'
import { addActionActivity } from '../actions/ActionService'
import type { BuildQueue } from './Build'
import type { Blueprint } from '../blueprints/Blueprint'
import type { EconomicsSettings } from '../../economics/EconomicsSettings'
import type { ActionConfiguration, ActionDefinition } from '../actions/Action'

// Construct the whole transaction before the caller persists it once. Each
// instance uses the existing snapshot factory and validates session constraints.
function createBatch(queue: BuildQueue, quantity: unknown, create: (queue: BuildQueue, index: number) => BuildQueue): BuildQueue {
  const count = requireBatchQuantity(quantity)
  const first = create(queue, 0)
  const existingIds = new Set(queue.map(activity => activity.id))
  const position = first.findIndex(activity => !existingIds.has(activity.id))
  let next = first
  for (let index = 1; index < count; index++) next = create(next, index)
  const added = next.filter(activity => !existingIds.has(activity.id))
  if (added.length !== count || new Set(added.map(activity => activity.id)).size !== count) throw new Error('Activity IDs must be unique.')
  return [...first.slice(0, position), ...added, ...first.slice(position + 1)]
}
export function enqueueBlueprintBatch(queue: BuildQueue, blueprint: Blueprint, economics: EconomicsSettings, quantity: unknown,
  now = Date.now(), newId: () => string = () => crypto.randomUUID()): BuildQueue {
  return createBatch(queue, quantity, (current, index) => enqueueBlueprintBuild(current, blueprint, economics, now, newId(), index === 0))
}
export function enqueueActionBatch(queue: BuildQueue, definition: ActionDefinition, option: string, configuration: ActionConfiguration,
  economics: EconomicsSettings, quantity: unknown, target?: string, session?: string, now = Date.now(), newId: () => string = () => crypto.randomUUID()): BuildQueue {
  return createBatch(queue, quantity, (current, index) => addActionActivity(current, definition, option, configuration, economics, target, session, now, newId(), index === 0))
}
