import type { Build } from '../../features/builds/Build'
import './BuildStatusBadge.css'
export default function BuildStatusBadge({ build, blocked, onToggle, labelPrefix = '', readOnly = false, actionOverride }: { build: Build; blocked: boolean; onToggle: () => void; labelPrefix?: string; readOnly?: boolean; actionOverride?: string }) {
  const className = 'blueprint-access-status build-status build-status-' + build.status.toLowerCase()
  if (readOnly || build.status === 'Completed') return <span className={className}>{build.status}</span>
  const action = actionOverride ?? (build.status === 'Working' ? 'pause' : build.status === 'Paused' ? 'resume' : 'start')
  const label = labelPrefix + build.status + ': ' + build.blueprintName + '. ' + (blocked ? 'Pause the current Activity first.' : 'Tap to ' + action + '.')
  return <button type="button" className={className} disabled={blocked} title={label} aria-label={label} onClick={onToggle}>{build.status}</button>
}
