import { validateActivity } from '../backup/Backup'
import { userStorage } from '../backup/UserStorage'
import { sanitizeEconomicsOverrides } from '../../economics/EconomicsSettings'
import type { Build, BuildQueue } from './Build'
import { tickBuildQueue } from './BuildQueueService'

export const BUILD_QUEUE_KEY = 'wasteland-workshop-build-queue'
type QueueStorage = Pick<Storage, 'getItem' | 'setItem'>
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
function validBuild(value: unknown): value is Build { try {validateActivity(value);return true}catch{return false} }

export function loadBuildQueue(storage: QueueStorage = userStorage, now = Date.now()): BuildQueue {
  const raw = storage.getItem(BUILD_QUEUE_KEY)
  if (!raw) return []
  const saved: unknown = JSON.parse(raw)
  if (!object(saved) || (saved.version !== 1 && saved.version !== 2) || !Array.isArray(saved.builds) || !saved.builds.every(validBuild)
    || new Set(saved.builds.map(build => build.id)).size !== saved.builds.length
    || saved.builds.filter(build => build.status === 'Working').length > 1) {
    throw new Error('Saved Work Queue is invalid or unsupported. Its stored data has been kept.')
  }
  const builds = saved.builds.map(build => ({ ...build, sourceType:build.sourceType??'Blueprint' as const,sourceId:build.sourceId??build.blueprintId, overrides: sanitizeEconomicsOverrides(build.overrides) }))
  return tickBuildQueue(builds, now)
}
export function saveBuildQueue(queue: BuildQueue, storage: QueueStorage = userStorage) {
  storage.setItem(BUILD_QUEUE_KEY, JSON.stringify({ version: 2, builds: queue }))
}
