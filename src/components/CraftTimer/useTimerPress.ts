import { useEffect, useState, type PointerEvent, type MouseEvent } from 'react'
import { createTimerPress } from './TimerPress'
export function useTimerPress(tap: () => void, hold?: () => void) {
  const [press] = useState(() => createTimerPress(() => {}, () => {}))
  useEffect(() => { press.setCallbacks(tap, hold ?? (() => {})) }, [press,tap,hold])
  useEffect(() => {
    const cancel = () => press.cancel()
    window.addEventListener('scroll',cancel,true)
    window.addEventListener('blur',cancel)
    return () => { press.cancel(); window.removeEventListener('scroll',cancel,true); window.removeEventListener('blur',cancel) }
  }, [press])
  return {
    onPointerDown: (event: PointerEvent) => { if (hold && event.isPrimary && event.button === 0) press.begin(event.clientX,event.clientY) },
    onPointerMove: (event: PointerEvent) => press.move(event.clientX,event.clientY),
    onPointerUp: () => press.end(), onPointerCancel: () => press.cancel(), onPointerLeave: () => press.cancel(),
    onClick: () => { if (!hold) tap(); else press.click() },
    onContextMenu: (event: MouseEvent) => { if (hold) event.preventDefault() },
  }
}
