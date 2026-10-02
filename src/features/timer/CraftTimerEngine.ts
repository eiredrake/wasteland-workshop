import type { CraftTimerState } from './CraftTimerState'

const MINUTE_MS = 60 * 1000

export function startCraftTimer(
  durationMinutes: number,
  label?: string,
  nowMs = Date.now()
): CraftTimerState {
  const durationMs = Math.max(
    0,
    durationMinutes * MINUTE_MS
  )

  return {
    label,
    originalDurationMs: durationMs,
    remainingMs: durationMs,
    endTimeMs: nowMs + durationMs,
    status: durationMs > 0 ? 'running' : 'complete',
  }
}

export function getRemainingMs(
  timer: CraftTimerState,
  nowMs = Date.now()
): number {
  if (
    timer.status !== 'running' ||
    timer.endTimeMs === undefined
  ) {
    return timer.remainingMs
  }

  return Math.max(
    0,
    timer.endTimeMs - nowMs
  )
}

export function tickCraftTimer(
  timer: CraftTimerState,
  nowMs = Date.now()
): CraftTimerState {
  if (timer.status !== 'running') {
    return timer
  }

  const remainingMs = getRemainingMs(
    timer,
    nowMs
  )

  if (remainingMs === 0) {
    return {
      ...timer,
      remainingMs: 0,
      endTimeMs: undefined,
      status: 'complete',
    }
  }

  return {
    ...timer,
    remainingMs,
  }
}

export function beginCraftTimer(
  timer: CraftTimerState,
  nowMs = Date.now()
): CraftTimerState {
  if (
    timer.status !== 'idle' ||
    timer.remainingMs <= 0
  ) {
    return timer
  }

  return {
    ...timer,
    endTimeMs: nowMs + timer.remainingMs,
    status: 'running',
  }
}

export function pauseCraftTimer(
  timer: CraftTimerState,
  nowMs = Date.now()
): CraftTimerState {
  if (timer.status !== 'running') {
    return timer
  }

  return {
    ...timer,
    remainingMs: getRemainingMs(
      timer,
      nowMs
    ),
    endTimeMs: undefined,
    status: 'paused',
  }
}

export function resumeCraftTimer(
  timer: CraftTimerState,
  nowMs = Date.now()
): CraftTimerState {
  if (
    timer.status !== 'paused' ||
    timer.remainingMs <= 0
  ) {
    return timer
  }

  return {
    ...timer,
    endTimeMs:
      nowMs + timer.remainingMs,
    status: 'running',
  }
}

export function adjustCraftTimerMinutes(
  timer: CraftTimerState,
  minutes: number,
  nowMs = Date.now()
): CraftTimerState {
  const adjustmentMs =
    minutes * MINUTE_MS

  if (timer.status === 'running') {
    const currentRemainingMs =
      getRemainingMs(timer, nowMs)

    const newRemainingMs = Math.max(
      0,
      currentRemainingMs + adjustmentMs
    )

    if (newRemainingMs === 0) {
      return {
        ...timer,
        remainingMs: 0,
        endTimeMs: undefined,
        status: 'complete',
      }
    }

    return {
      ...timer,
      remainingMs: newRemainingMs,
      endTimeMs:
        nowMs + newRemainingMs,
    }
  }

  const newRemainingMs = Math.max(
    0,
    timer.remainingMs + adjustmentMs
  )

  return {
    ...timer,
    remainingMs: newRemainingMs,
    status:
      newRemainingMs === 0
        ? 'complete'
        : timer.status === 'complete'
          ? 'paused'
          : timer.status,
  }
}

export function resetCraftTimer(
  timer: CraftTimerState
): CraftTimerState {
  return {
    ...timer,
    remainingMs:
      timer.originalDurationMs,
    endTimeMs: undefined,
    status: 'idle',
  }
}