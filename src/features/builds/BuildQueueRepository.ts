import { userStorage } from '../backup/UserStorage'
import { defaultEconomicsSettings, sanitizeEconomicsOverrides, validEconomicValue } from '../../economics/EconomicsSettings'
import type { Build, BuildQueue } from './Build'
import { tickBuildQueue } from './BuildQueueService'

export const BUILD_QUEUE_KEY = 'wasteland-workshop-build-queue'
type QueueStorage = Pick<Storage, 'getItem' | 'setItem'>
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const id = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0
function validBuild(value: unknown): value is Build {
  if (!object(value) || typeof value.id !== 'string' || !value.id || !id(value.blueprintId)
    || typeof value.blueprintName !== 'string' || typeof value.notes !== 'string' || !validEconomicValue(value.createdAt)
    || (value.startedAt !== undefined && !validEconomicValue(value.startedAt))
    || (value.completedAt !== undefined && !validEconomicValue(value.completedAt))) return false
  const { recipe, timer, economicSnapshot: economics } = value
  if (!object(recipe) || !id(recipe.id) || !validEconomicValue(recipe.craftingTimeInMinute)
    || !validEconomicValue(recipe.craftingMindCost) || (recipe.craftingResolveCost !== null && !validEconomicValue(recipe.craftingResolveCost))
    || !Array.isArray(recipe.craftingComponents) || !Array.isArray(recipe.craftingFinalProducts)
    || !recipe.craftingComponents.every(c => object(c) && validEconomicValue(c.amount) && object(c.component)
      && id(c.component.id) && typeof c.component.name === 'string')) return false
  if (!object(economics) || !Object.keys(defaultEconomicsSettings).every(key => validEconomicValue(economics[key]))
    || !object(economics.resourceValues) || !Object.entries(economics.resourceValues).every(([key, amount]) => id(Number(key)) && validEconomicValue(amount))) return false
  if (!object(timer) || !validEconomicValue(timer.originalDurationMs) || !validEconomicValue(timer.remainingMs)
    || (timer.endTimeMs !== undefined && !validEconomicValue(timer.endTimeMs))) return false
  const statuses: Record<string,string> = { Enqueued: 'idle', Working: 'running', Paused: 'paused', Completed: 'complete' }
  if (typeof value.status !== 'string' || statuses[value.status] !== timer.status) return false
  if (value.status === 'Working' && (timer.endTimeMs === undefined || timer.remainingMs === 0 || value.startedAt === undefined)) return false
  if (value.status !== 'Working' && timer.endTimeMs !== undefined) return false
  if (value.status === 'Completed' && (timer.remainingMs !== 0 || value.completedAt === undefined)) return false
  return object(value.overrides)
}
export function loadBuildQueue(storage: QueueStorage = userStorage, now = Date.now()): BuildQueue {
  const raw = storage.getItem(BUILD_QUEUE_KEY)
  if (!raw) return []
  const saved: unknown = JSON.parse(raw)
  if (!object(saved) || saved.version !== 1 || !Array.isArray(saved.builds) || !saved.builds.every(validBuild)
    || new Set(saved.builds.map(build => build.id)).size !== saved.builds.length
    || saved.builds.filter(build => build.status === 'Working').length > 1) {
    throw new Error('Saved Build Queue is invalid or unsupported. Its stored data has been kept.')
  }
  const builds = saved.builds.map(build => ({ ...build, overrides: sanitizeEconomicsOverrides(build.overrides) }))
  return tickBuildQueue(builds, now)
}
export function saveBuildQueue(queue: BuildQueue, storage: QueueStorage = userStorage) {
  storage.setItem(BUILD_QUEUE_KEY, JSON.stringify({ version: 1, builds: queue }))
}
