// Suppress repeated clicks while successful queue navigation settles.
// Validation/storage failures remain immediately retryable.
export function createQueueSubmissionGuard(clock: () => number = Date.now) {
  let busy = false, lastSuccess = -Infinity
  return (submit: () => boolean): boolean => {
    if (busy || clock() - lastSuccess < 750) return false
    busy = true
    try {
      const success = submit()
      if (success) lastSuccess = clock()
      return success
    } finally { busy = false }
  }
}
