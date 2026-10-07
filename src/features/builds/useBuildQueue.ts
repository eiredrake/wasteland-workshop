import { useEffect, useRef, useState } from 'react'
import { loadBuildQueue, saveBuildQueue } from './BuildQueueRepository'
import { createBuildCompletionTracker, tickBuildQueue, workingBuild } from './BuildQueueService'
import type { BuildQueue } from './Build'

export function useBuildQueue(onComplete: () => void, notify: (message: string) => void) {
  const [initial] = useState(() => {
    try { return { builds: loadBuildQueue(), error: '' } }
    catch { return { builds: [] as BuildQueue, error: 'Saved Build Queue could not be read. Stored data has been kept; queue changes are disabled.' } }
  })
  const [builds, setBuilds] = useState(initial.builds)
  const queueRef = useRef(builds)
  const callbacks = useRef({ onComplete, notify })
  useEffect(() => { callbacks.current = { onComplete, notify } }, [onComplete, notify])
  const completionTracker = useRef(createBuildCompletionTracker(initial.builds))
  function publish(next: BuildQueue) {
    queueRef.current = next
    setBuilds(next)
    completionTracker.current(next).forEach(() => callbacks.current.onComplete())
  }
  function apply(operation: (queue: BuildQueue) => BuildQueue): boolean {
    if (initial.error) { callbacks.current.notify(initial.error); return false }
    try {
      const next = operation(queueRef.current)
      if (next === queueRef.current) return true
      saveBuildQueue(next)
      publish(next)
      return true
    } catch (error) {
      callbacks.current.notify(error instanceof Error ? error.message : 'Build Queue could not be saved. Your previous queue was kept.')
      return false
    }
  }
  useEffect(() => {
    if (initial.error || !initial.builds.length) return
    try { saveBuildQueue(initial.builds) }
    catch { callbacks.current.notify('Restored Build Queue could not be saved. Existing stored data was kept.') }
  }, [initial])
  const activeId = workingBuild(builds)?.id
  useEffect(() => {
    if (!activeId) return
    const update = () => {
      const next = tickBuildQueue(queueRef.current)
      if (next === queueRef.current) return
      // Running deadlines are already persisted; write on completion, not every tick.
      if (!workingBuild(next)) {
        try { saveBuildQueue(next) }
        catch { callbacks.current.notify('Build finished, but its completion could not be saved. Keep this app open and try saving the Build again.') }
      }
      queueRef.current = next
      setBuilds(next)
      completionTracker.current(next).forEach(() => callbacks.current.onComplete())
    }
    const visible = () => { if (document.visibilityState === 'visible') update() }
    const interval = window.setInterval(update, 250)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('pageshow', update)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', update) }
  }, [activeId])
  return { builds, apply, error: initial.error }
}
