// Gesture recognition only; timer state stays with the Build's existing owner.
export function createTimerPress(tap: () => void, hold: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let origin = { x: 0, y: 0 }, suppressed = false, active = false
  const end = () => { clearTimeout(timeout); timeout = undefined; active = false }
  const cancel = () => { if (active) suppressed = true; end() }
  return {
    setCallbacks(nextTap: () => void, nextHold: () => void) { tap = nextTap; hold = nextHold },
    begin(x: number, y: number) {
      end(); active = true; suppressed = false; origin = { x, y }
      timeout = setTimeout(() => { timeout = undefined; suppressed = true; hold() },500)
    },
    move(x: number, y: number) { if (active && Math.hypot(x-origin.x,y-origin.y) > 10) cancel() },
    end, cancel,
    prepareKeyboard() { end(); suppressed = false },
    click() { end(); if (!suppressed) tap(); suppressed = false },
  }
}
