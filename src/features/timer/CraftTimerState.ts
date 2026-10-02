export type CraftTimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'complete'

export type CraftTimerState = {
  label?: string
  originalDurationMs: number
  remainingMs: number
  endTimeMs?: number
  status: CraftTimerStatus
}

export const DEFAULT_CRAFT_TIMER_MINUTES = 10

export function createIdleCraftTimer(): CraftTimerState {
  const durationMs =
    DEFAULT_CRAFT_TIMER_MINUTES * 60 * 1000

  return {
    originalDurationMs: durationMs,
    remainingMs: durationMs,
    status: 'idle',
  }
}