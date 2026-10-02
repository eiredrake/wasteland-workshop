import {
  useEffect,
  useRef,
  type CSSProperties,
} from 'react'
import type { CraftTimerState } from '../../features/timer/CraftTimerState'
import {
  adjustCraftTimerMinutes,
  beginCraftTimer,
  pauseCraftTimer,
  resetCraftTimer,
  resumeCraftTimer,
  tickCraftTimer,
} from '../../features/timer/CraftTimerEngine'
import './CraftTimer.css'

type CraftTimerProps = {
  timer: CraftTimerState
  onChange: (timer: CraftTimerState) => void
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000)
  )

  const hours = Math.floor(totalSeconds / 3600)

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  )

  const seconds = totalSeconds % 60

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':')
}

function CraftTimer({
  timer,
  onChange,
}: CraftTimerProps) {
  const holdTimeoutRef =
    useRef<number | undefined>(undefined)

  const holdIntervalRef =
    useRef<number | undefined>(undefined)

  const holdStartRef =
    useRef<number | undefined>(undefined)

  const timerRef = useRef(timer)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    timerRef.current = timer
  }, [timer])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (timer.status !== 'running') {
      return
    }

    const intervalId = window.setInterval(() => {
      onChangeRef.current(
        tickCraftTimer(timerRef.current)
      )
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [timer.status])

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current !== undefined) {
        window.clearTimeout(holdTimeoutRef.current)
      }

      if (holdIntervalRef.current !== undefined) {
        window.clearTimeout(holdIntervalRef.current)
      }
    }
  }, [])

  const duration =
    timer.originalDurationMs > 0
      ? timer.originalDurationMs
      : 1

  const remainingProgress = Math.max(
    0,
    Math.min(
      1,
      timer.remainingMs / duration
    )
  )

  const progressDegrees =
    remainingProgress * 360

  const timerColor =
    remainingProgress > 0.75
      ? '#c6533f'
      : remainingProgress >= 0.3
        ? '#d5a63e'
        : '#72a866'

  const handleStartStop = () => {
    if (timer.status === 'running') {
      onChange(pauseCraftTimer(timer))
      return
    }

    if (timer.status === 'paused') {
      onChange(resumeCraftTimer(timer))
      return
    }

    if (timer.status === 'idle') {
      onChange(beginCraftTimer(timer))
    }
  }

  const handleReset = () => {
    onChange(resetCraftTimer(timer))
  }

  const adjustMinutes = (minutes: number) => {
    const updatedTimer =
      adjustCraftTimerMinutes(
        timerRef.current,
        minutes
      )

    timerRef.current = updatedTimer
    onChangeRef.current(updatedTimer)
  }

  const stopAdjusting = () => {
    if (holdTimeoutRef.current !== undefined) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = undefined
    }

    if (holdIntervalRef.current !== undefined) {
      window.clearTimeout(holdIntervalRef.current)
      holdIntervalRef.current = undefined
    }

    holdStartRef.current = undefined
  }

  const startAdjusting = (minutes: number) => {
    stopAdjusting()

    adjustMinutes(minutes)

    holdStartRef.current = Date.now()

    holdTimeoutRef.current = window.setTimeout(() => {
      const repeat = () => {
        adjustMinutes(minutes)

        const heldFor =
          Date.now() -
          (holdStartRef.current ?? Date.now())

        const delay =
          heldFor >= 4000
            ? 75
            : heldFor >= 2000
              ? 150
              : 300

        holdIntervalRef.current =
          window.setTimeout(repeat, delay)
      }

      repeat()
    }, 500)
  }

  return (
    <section className="craft-timer">
      <div className="craft-timer-heading">
        <span>Craft Timer</span>

        {timer.label && (
          <strong>{timer.label}</strong>
        )}
      </div>

      <div
        className="craft-timer-ring"
        style={{
          '--timer-progress': `${progressDegrees}deg`,
          '--timer-color': timerColor,
        } as CSSProperties}
      >
        <div className="craft-timer-face">
          <span className="craft-timer-time">
            {formatDuration(timer.remainingMs)}
          </span>

          <span className="craft-timer-status">
            {timer.status === 'complete'
              ? 'Complete'
              : timer.status === 'paused'
                ? 'Stopped'
                : timer.status === 'running'
                  ? 'Crafting'
                  : 'Ready'}
          </span>
        </div>
      </div>

      <div className="craft-timer-adjustments">
        <button
          type="button"
          aria-label="Remove one minute"
          onPointerDown={() =>
            startAdjusting(-1)
          }
          onPointerUp={stopAdjusting}
          onPointerCancel={stopAdjusting}
          onPointerLeave={stopAdjusting}
        >
          −
        </button>

        <span>Adjust Minutes</span>

        <button
          type="button"
          aria-label="Add one minute"
          onPointerDown={() =>
            startAdjusting(1)
          }
          onPointerUp={stopAdjusting}
          onPointerCancel={stopAdjusting}
          onPointerLeave={stopAdjusting}
        >
          +
        </button>
      </div>

      <div className="craft-timer-controls">
        <button
          type="button"
          onClick={handleStartStop}
          disabled={timer.status === 'complete'}
        >
          {timer.status === 'running'
            ? 'Stop'
            : 'Start'}
        </button>

        <button
          type="button"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

export default CraftTimer