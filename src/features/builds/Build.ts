import type { ActionExecution } from '../actions/Action'
import type { EconomicsOverrides, EconomicsSettings } from '../../economics/EconomicsSettings'
import type { ItemCrafting } from '../blueprints/ItemCrafting'
import type { CraftTimerState } from '../timer/CraftTimerState'

export type BuildStatus = 'Enqueued' | 'Working' | 'Paused' | 'Completed'
export type Activity = {
  sourceType?: 'Blueprint' | 'Action'
  sourceId?: number | string
  sourceVersion?: number | string
  actionSnapshot?: ActionExecution
  id: string
  blueprintId?: number
  blueprintName: string
  recipe: ItemCrafting
  economicSnapshot: EconomicsSettings
  overrides: EconomicsOverrides
  notes: string
  status: BuildStatus
  timer: CraftTimerState
  createdAt: number
  startedAt?: number
  completedAt?: number
}
// Build remains an internal compatibility alias; both sources share the same engine.
export type Build = Activity
// Array order is the authoritative, persisted queue position, independent of status.
export type BuildQueue = Build[]
