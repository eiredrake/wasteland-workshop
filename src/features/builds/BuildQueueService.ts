import { createCompletionTracker } from '../timer/CraftAlarm'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import { sanitizeEconomicsOverrides, type EconomicsOverrides, type EconomicsSettings } from '../../economics/EconomicsSettings'
import type { Blueprint } from '../blueprints/Blueprint'
import { beginCraftTimer, loadCraftTimer, pauseCraftTimer, resumeCraftTimer, tickCraftTimer } from '../timer/CraftTimerEngine'
import type { CraftTimerState } from '../timer/CraftTimerState'
import type { Build, BuildQueue } from './Build'

export const ACTIVE_BUILD_MESSAGE = 'Pause the current Build before starting another.'
export function workingBuild(queue: BuildQueue): Build | undefined { return queue.find(build => build.status === 'Working') }
function findBuild(queue: BuildQueue, id: string): Build {
  const build = queue.find(item => item.id === id)
  if (!build) throw new Error('That Build is no longer in the queue.')
  return build
}
function replace(queue: BuildQueue, build: Build): BuildQueue { return queue.map(item => item.id === build.id ? build : item) }
function withTimer(build: Build, timer: CraftTimerState, now: number): Build {
  const status = timer.status === 'complete' ? 'Completed' : timer.status === 'running' ? 'Working' : timer.status === 'paused' ? 'Paused' : 'Enqueued'
  return { ...build, timer, status,
    startedAt: build.startedAt ?? (status === 'Working' || status === 'Completed' ? now : undefined),
    completedAt: status === 'Completed' ? (build.completedAt ?? timer.endTimeMs ?? now) : undefined }
}
export function addBuild(queue: BuildQueue, blueprint: Blueprint, economics: EconomicsSettings,
  immediately = false, now = Date.now(), id: string = crypto.randomUUID()): BuildQueue {
  if (immediately && workingBuild(queue)) throw new Error(ACTIVE_BUILD_MESSAGE)
  const recipe = blueprint.itemCraftings?.[0]
  if (!recipe) throw new Error('This Blueprint has no crafting recipe.')
  if (queue.some(item => item.id === id)) throw new Error('Build IDs must be unique.')
  const build: Build = { id, blueprintId: blueprint.id, blueprintName: blueprint.name,
    recipe: structuredClone(recipe), economicSnapshot: structuredClone(economics), overrides: {}, notes: '',
    status: 'Enqueued', timer: loadCraftTimer(recipe.craftingTimeInMinute, blueprint.name), createdAt: now }
  if (!immediately) return [...queue, build]
  const started = withTimer(build, beginCraftTimer(build.timer, now), now)
  // Zero-duration recipes finish immediately; they cannot own a running timer.
  const ready = build.timer.remainingMs === 0 ? withTimer(build, { ...build.timer, status: 'complete' }, now) : started
  return [ready, ...queue]
}
// Blueprint Build action starts only when the queue is entirely empty.
export function enqueueBlueprintBuild(queue: BuildQueue, blueprint: Blueprint, economics: EconomicsSettings,
  now = Date.now(), id: string = crypto.randomUUID()): BuildQueue {
  return addBuild(queue, blueprint, economics, queue.length === 0, now, id)
}
export function toggleBuildStatus(queue: BuildQueue, id: string, now = Date.now()): BuildQueue {
  const build = findBuild(queue, id)
  if (build.status === 'Completed') return queue
  if (build.status === 'Working') {
    const updated = tickCraftTimer(build.timer, now)
    if (updated.status === 'complete') return replace(queue, { ...withTimer(build, updated, now), completedAt: build.timer.endTimeMs ?? now })
    return replace(queue, withTimer(build, pauseCraftTimer(updated, now), now))
  }
  if (workingBuild(queue)) throw new Error(ACTIVE_BUILD_MESSAGE)
  const timer = build.timer.remainingMs === 0 ? { ...build.timer, status: 'complete' as const }
    : build.status === 'Paused' ? resumeCraftTimer(build.timer, now) : beginCraftTimer(build.timer, now)
  return replace(queue, withTimer(build, timer, now))
}
// Called only after the user confirms switching their active project.
export function startBuildAtTop(queue: BuildQueue, id: string, now = Date.now()): BuildQueue {
  const target = findBuild(queue, id)
  if (target.status === 'Completed') throw new Error('Completed Builds cannot be restarted.')
  const active = workingBuild(queue)
  let next = active && active.id !== id ? toggleBuildStatus(queue, active.id, now) : queue
  if (findBuild(next, id).status !== 'Working') next = toggleBuildStatus(next, id, now)
  return [findBuild(next, id), ...next.filter(build => build.id !== id)]
}
export function tickBuildQueue(queue: BuildQueue, now = Date.now()): BuildQueue {
  const build = workingBuild(queue)
  if (!build) return queue
  const timer = tickCraftTimer(build.timer, now)
  if (timer.remainingMs === build.timer.remainingMs && timer.status === build.timer.status) return queue
  const updated = withTimer(build, timer, now)
  if (updated.status === 'Completed') updated.completedAt = build.timer.endTimeMs ?? now
  return replace(queue, updated)
}
export function changeBuildTimer(queue: BuildQueue, id: string, timer: CraftTimerState, now = Date.now()): BuildQueue {
  const build = findBuild(queue, id)
  if (build.status === 'Completed') throw new Error('Completed Builds cannot be restarted or adjusted.')
  if (timer.status === 'running' && workingBuild(queue)?.id !== id && workingBuild(queue)) throw new Error(ACTIVE_BUILD_MESSAGE)
  if (build.status === 'Enqueued') throw new Error('Start this Build before adjusting its timer.')
  if (timer.status === 'idle' && build.startedAt !== undefined) throw new Error('Started Builds must be paused or completed, not reset to Enqueued.')
  if (timer.originalDurationMs !== build.timer.originalDurationMs) throw new Error('The original crafting duration is fixed.')
  return replace(queue, withTimer(build, { ...timer, label: build.blueprintName }, now))
}
export function editBuild(queue: BuildQueue, id: string, notes: string, overrides: EconomicsOverrides): BuildQueue {
  return replace(queue, { ...findBuild(queue, id), notes, overrides: sanitizeEconomicsOverrides(overrides) })
}
export function moveBuild(queue: BuildQueue, id: string, direction: -1 | 1): BuildQueue {
  if (findBuild(queue, id).status === 'Working') throw new Error('Pause this Build before reordering it.')
  // Keep the Working slot fixed even when other rows move around it.
  const movable = queue.filter(build => build.status !== 'Working')
  const index = movable.findIndex(build => build.id === id), target = index + direction
  if (target < 0 || target >= movable.length) return queue
  ;[movable[index], movable[target]] = [movable[target], movable[index]]
  let position = 0
  return queue.map(build => build.status === 'Working' ? build : movable[position++])
}
export function deleteBuilds(queue: BuildQueue, ids: string[]): BuildQueue {
  if (queue.some(build => ids.includes(build.id) && build.status === 'Working')) throw new Error('Pause the Working Build before deleting it.')
  return queue.filter(build => !ids.includes(build.id))
}
export function effectiveBuildEconomics(build: Build): EconomicsSettings {
  const overrides = sanitizeEconomicsOverrides(build.overrides)
  return { ...build.economicSnapshot, ...overrides,
    resourceValues: { ...build.economicSnapshot.resourceValues, ...overrides.resourceValues } }
}
export function buildCalculator(build: Build): DefaultCostCalculator {
  return DefaultCostCalculator.fromSnapshot(effectiveBuildEconomics(build))
}
export function calculateBuildCost(build: Build) { return calculateBlueprintCost(build.recipe, buildCalculator(build)) }

// One tracker per Build owner. Completion is consumed before browser side effects.
export function createBuildCompletionTracker(initial: BuildQueue) {
  const trackers = new Map(initial.map(build => [build.id, createCompletionTracker(build.timer.status)]))
  return (queue: BuildQueue): string[] => {
    const finished: string[] = []
    for (const build of queue) {
      let tracker = trackers.get(build.id)
      if (!tracker) { tracker = createCompletionTracker('idle'); trackers.set(build.id,tracker) }
      if (tracker(build.timer.status)) finished.push(build.id)
    }
    for (const id of trackers.keys()) if (!queue.some(build => build.id === id)) trackers.delete(id)
    return finished
  }
}
