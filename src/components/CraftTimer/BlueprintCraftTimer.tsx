import type { CSSProperties } from 'react'
import type { CraftTimerState } from '../../features/timer/CraftTimerState'
import './BlueprintCraftTimer.css'

type BlueprintCraftTimerProps = {
  blueprintName: string
  minutes: number
  timer: CraftTimerState
  onStart: () => void
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

function BlueprintCraftTimer({
  blueprintName,
  minutes,
  timer,
  onStart,
}: BlueprintCraftTimerProps) {
  const isActiveBlueprint =
    timer.label === blueprintName &&
    timer.status !== 'idle'

  const defaultDurationMs =
    minutes * 60 * 1000

  const displayMilliseconds =
    isActiveBlueprint
      ? timer.remainingMs
      : defaultDurationMs

  const duration =
    isActiveBlueprint &&
    timer.originalDurationMs > 0
      ? timer.originalDurationMs
      : defaultDurationMs

  const remainingProgress =
    duration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            displayMilliseconds / duration
          )
        )
      : 0

  const progressDegrees =
    remainingProgress * 360

  const timerColor =
    remainingProgress > 0.75
      ? '#c6533f'
      : remainingProgress >= 0.3
        ? '#d5a63e'
        : '#72a866'

  const statusText =
    !isActiveBlueprint
      ? 'Start'
      : timer.status === 'running'
        ? 'Crafting'
        : timer.status === 'paused'
          ? 'Stopped'
          : timer.status === 'complete'
            ? 'Complete'
            : 'Start'

  const handleClick = () => {
    onStart()
  }

  return (
    <button
      type="button"
      className="blueprint-craft-timer"
      onClick={handleClick}
      aria-label={
        isActiveBlueprint
          ? `Open craft timer for ${blueprintName}`
          : `Start ${minutes} minute craft timer for ${blueprintName}`
      }
      style={{
        '--timer-progress': `${progressDegrees}deg`,
        '--timer-color': timerColor,
      } as CSSProperties}
    >
          <span
      className="blueprint-craft-timer-ring"
      style={{
        '--timer-progress': `${progressDegrees}deg`,
        '--timer-color': timerColor,
      } as CSSProperties}
    >
      <span className="blueprint-craft-timer-face">
        <span className="blueprint-craft-timer-time">
          {formatDuration(displayMilliseconds)}
        </span>

        <span className="blueprint-craft-timer-start">
          {statusText}
        </span>
      </span>
    </span>
    </button>
  )
}

export default BlueprintCraftTimer