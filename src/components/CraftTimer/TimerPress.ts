// Gesture recognition only; timer state stays with the Build's existing owner.
export function createTimerPress(tap: () => void, hold: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let origin = { x: 0, y: 0 }, suppressed = false
  const end = () => { clearTimeout(timeout); timeout = undefined }
  const cancel = () => { end(); suppressed = true }
  return {
    setCallbacks(nextTap: () => void, nextHold: () => void) { tap = nextTap; hold = nextHold },
    begin(x: number, y: number) {
      end(); suppressed = false; origin = { x, y }
      timeout = setTimeout(() => { timeout = undefined; suppressed = true; hold() },650)
    },
    move(x: number, y: number) { if (Math.hypot(x-origin.x,y-origin.y) > 10) cancel() },
    end, cancel,
    click() { end(); if (!suppressed) tap(); suppressed = false },
  }
}
