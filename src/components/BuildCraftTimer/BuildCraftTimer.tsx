import BlueprintCraftTimer from '../CraftTimer/BlueprintCraftTimer'
import type { Build } from '../../features/builds/Build'
import './BuildCraftTimer.css'

export default function BuildCraftTimer({ build, blocked, onToggle, onSettings }: {
  build: Build; blocked: boolean; onToggle: () => void; onSettings: () => void
}) {
  return <div className="build-compact-timer">
    <BlueprintCraftTimer blueprintName={build.blueprintName} minutes={build.timer.originalDurationMs / 60000}
      timer={build.timer} compact blocked={blocked} onStart={onToggle} onSettings={onSettings}
      actionLabel={'Timer for ' + build.blueprintName + '. ' + (blocked ? 'Pause the current Activity first.' : 'Tap to ' + (build.status === 'Working' ? 'pause' : build.status === 'Enqueued' ? 'start' : 'resume') + '; hold for timer settings.')} />
    {blocked && <span className="build-timer-blocked">Pause the current Activity first.</span>}
    <button type="button" className="build-timer-settings" onClick={onSettings} aria-label={'Timer settings for ' + build.blueprintName}>Timer Settings</button>
  </div>
}
