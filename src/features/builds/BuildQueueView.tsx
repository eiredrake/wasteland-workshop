import { allBlueprints } from '../blueprints/blueprints'
import BuildCraftTimer from '../../components/BuildCraftTimer/BuildCraftTimer'
import { useState } from 'react'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import BuildStatusBadge from '../../components/BuildStatusBadge/BuildStatusBadge'
import BuildDetails from './BuildDetails'
import type { BuildQueue } from './Build'
import { calculateBuildCost, deleteBuilds, editBuild, moveBuild, toggleBuildStatus, startBuildAtTop, workingBuild } from './BuildQueueService'
import { credits, duration } from './BuildFormatting'
import '../blueprints/BlueprintCollectionsView.css'
import './BuildQueueView.css'

export default function BuildQueueView({ builds, apply, onTimer, error }: {
  builds: BuildQueue; apply: (operation: (queue: BuildQueue) => BuildQueue) => boolean; onTimer: (id: string) => void; error: string
}) {
  const [selected, setSelected] = useState<string[]>([]), [detailsId, setDetailsId] = useState<string>(), [deleting, setDeleting] = useState<string[]>()
  const [startingId, setStartingId] = useState<string>()
  const starting = builds.find(build => build.id === startingId)
  const active = workingBuild(builds), details = builds.find(build => build.id === detailsId)
  const selectable = builds.filter(build => build.status !== 'Working'), movable = selectable.map(build => build.id)
  const selection = selected.filter(id => selectable.some(build => build.id === id))
  if (details) return <BuildDetails key={details.id} build={details} onClose={() => setDetailsId(undefined)} onTimer={() => onTimer(details.id)}
    showTimer={builds[0]?.id === details.id} blocked={!!active && active.id !== details.id}
    onToggle={() => apply(queue => toggleBuildStatus(queue,details.id))}
    onSave={(notes,overrides) => apply(queue => editBuild(queue,details.id,notes,overrides))} />
  return <section className="blueprint-collections-page build-queue-page">
    <header className="blueprint-collections-header"><div><h2>Build Queue</h2><p>Planned work, your active project, and completed history.</p></div></header>
    {error && <p role="alert">{error}</p>}
    <div className="build-actions build-selection-actions">
      <button type="button" className="secondary-button" disabled={!selectable.length} onClick={() => setSelected(movable)}>Select All</button>
      <button type="button" className="secondary-button" disabled={!selection.length} onClick={() => setSelected([])}>Deselect All</button>
      <button type="button" className="secondary-button" disabled={!selection.length} onClick={() => setDeleting(selection)}>Delete Selected ({selection.length})</button>
    </div>
    {!builds.length && <p>Add a Blueprint to the Build Queue from its details, or tap its timer to start crafting immediately.</p>}
    <ol className="build-queue-list">
      {builds.map((build,index) => {
        const working = build.status === 'Working', blocked = !!active && !working && build.status !== 'Completed'
        const position = movable.indexOf(build.id), cost = calculateBuildCost(build)
        return <li key={build.id} className={'blueprint-collection-card build-card build-card-' + build.status.toLowerCase()}>
          <div className="build-row-heading">
            <label className="build-checkbox"><input type="checkbox" checked={!working && selection.includes(build.id)} disabled={working} aria-label={'Select Build ' + (index + 1) + ': ' + build.blueprintName}
              onChange={event => setSelected(event.target.checked ? [...selection,build.id] : selection.filter(id => id !== build.id))} /></label>
            <button type="button" className="build-name" onClick={() => setDetailsId(build.id)}>{build.blueprintName}<span>Build {index + 1} · View details{!allBlueprints.some(blueprint=>blueprint.id===build.blueprintId) && ' · Catalog entry unavailable'}</span></button>
            <BuildStatusBadge readOnly={index === 0} actionOverride="move to top and start" build={build} blocked={false} onToggle={() => setStartingId(build.id)} />
          </div>
          <div className="build-timer-row"><p className="build-time">Original: {duration(build.timer.originalDurationMs)} · {build.status === 'Completed' ? 'Finished' : 'Remaining: ' + duration(build.timer.remainingMs)}</p>
            {index === 0 && build.status !== 'Completed' && <BuildCraftTimer build={build} blocked={blocked}
              onToggle={() => apply(queue => toggleBuildStatus(queue,build.id))} onSettings={() => onTimer(build.id)} />}
          </div>
          <p><strong>Build cost: {credits(cost.productionCost)}</strong></p>
          {build.notes && <p className="build-notes-preview">{build.notes}</p>}
          {build.completedAt !== undefined && <p>Completed {new Date(build.completedAt).toLocaleString()}</p>}
          <div className="build-actions">
            <button type="button" className="secondary-button" onClick={() => setDetailsId(build.id)}>Notes &amp; Overrides</button>
            {!working && <><button type="button" className="secondary-button" disabled={position === 0} aria-label={'Move Build ' + (index + 1) + ' up'} onClick={() => apply(queue => moveBuild(queue,build.id,-1))}>↑ Move Up</button>
              <button type="button" className="secondary-button" disabled={position === movable.length - 1} aria-label={'Move Build ' + (index + 1) + ' down'} onClick={() => apply(queue => moveBuild(queue,build.id,1))}>↓ Move Down</button>
              <button type="button" className="secondary-button" aria-label={'Delete Build ' + (index + 1) + ': ' + build.blueprintName} onClick={() => setDeleting([build.id])}>Delete</button></>}
            {working && <span className="build-locked">Active · position locked</span>}
          </div>
        </li>
      })}
    </ol>
    {starting && <ConfirmationDialog title={'Start ' + starting.blueprintName + '?'}
      message={active && active.id !== starting.id
        ? 'This will pause ' + active.blueprintName + ', preserve its remaining time, move this Build to the top, and start it immediately.'
        : 'This will move this Build to the top of the queue and start it immediately.'}
      confirmLabel="Move to Top & Start" onCancel={() => setStartingId(undefined)} onConfirm={() => {
        apply(queue => startBuildAtTop(queue,starting.id))
        setStartingId(undefined)
      }} />}
    {deleting && <ConfirmationDialog title={'Delete ' + deleting.length + (deleting.length === 1 ? ' Build?' : ' Builds?')} message="This removes the selected jobs, notes, and history from this device. Blueprints and other Builds remain."
      onCancel={() => setDeleting(undefined)} onConfirm={() => {
        if (apply(queue => deleteBuilds(queue,deleting))) setSelected(selected.filter(id => !deleting.includes(id)))
        setDeleting(undefined)
      }} />}
  </section>
}
