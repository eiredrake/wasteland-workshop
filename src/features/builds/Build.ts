import type { EconomicsOverrides, EconomicsSettings } from '../../economics/EconomicsSettings'
import type { ItemCrafting } from '../blueprints/ItemCrafting'
import type { CraftTimerState } from '../timer/CraftTimerState'

export type BuildStatus = 'Enqueued' | 'Working' | 'Paused' | 'Completed'
export type Build = {
  id: string
  blueprintId: number
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
// Array order is the authoritative, persisted queue position, independent of status.
export type BuildQueue = Build[]
