import BuildCraftTimer from '../../components/BuildCraftTimer/BuildCraftTimer'
import { useState } from 'react'
import type { EconomicSetting, EconomicsOverrides } from '../../economics/EconomicsSettings'
import { defaultEconomicsSettings, validEconomicValue } from '../../economics/EconomicsSettings'
import type { Build } from './Build'
import { buildCalculator, calculateBuildCost, effectiveBuildEconomics } from './BuildQueueService'
import { credits, duration } from './BuildFormatting'

const labels: Record<EconomicSetting,string> = { mindCostPerPoint: 'Mind (cr / point)', timeCostPerMinute: 'Time (cr / minute)', resolveCostPerPoint: 'Resolve (cr / point)', foragingCardCost: 'Foraging Card (cr / card)', defaultMarkupPercent: 'Markup (%)' }
export default function BuildDetails({ build, onSave, onClose, onTimer, onToggle, blocked, showTimer }: {
  onToggle: () => void; blocked: boolean; showTimer: boolean
  build: Build; onSave: (notes: string, overrides: EconomicsOverrides) => boolean; onClose: () => void; onTimer: () => void
}) {
  const [notes, setNotes] = useState(build.notes)
  const [draft, setDraft] = useState<Record<string,string>>(() => {
    const fields: Record<string,string> = {}
    for (const key of Object.keys(defaultEconomicsSettings) as EconomicSetting[]) if (build.overrides[key] !== undefined) fields[key] = String(build.overrides[key])
    for (const [id, amount] of Object.entries(build.overrides.resourceValues ?? {})) fields['resource-' + id] = String(amount)
    return fields
  })
  const overrides: EconomicsOverrides = { resourceValues: {} }
  let invalid = false
  for (const [key, text] of Object.entries(draft)) {
    if (!text.trim()) continue
    const amount = Number(text)
    if (!validEconomicValue(amount)) { invalid = true; continue }
    if (key.startsWith('resource-')) overrides.resourceValues![Number(key.slice(9))] = amount
    else overrides[key as EconomicSetting] = amount
  }
  const preview = { ...build, overrides }, effective = effectiveBuildEconomics(preview), cost = calculateBuildCost(preview)
  const calculator = buildCalculator(preview)
  function field(key: string, label: string, captured: number | undefined, value: number | undefined) {
    const text = draft[key] ?? '', error = !!text.trim() && !validEconomicValue(Number(text))
    const inputId = 'build-' + build.id + '-' + key
    return <div className="build-value" key={key}>
      <label htmlFor={inputId}>{label}<span>Captured: {captured === undefined ? 'Unknown' : captured} · Effective: {error ? 'Invalid' : value === undefined ? 'Unknown' : value}</span></label>
      <div><input id={inputId} type="number" inputMode="decimal" step="any" min="0" max={Number.MAX_SAFE_INTEGER}
        placeholder={captured === undefined ? 'Unknown' : String(captured)} value={text} aria-invalid={error || undefined}
        onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
        <button type="button" className="secondary-button" disabled={!text} aria-label={'Reset ' + label + ' to captured value'} onClick={() => setDraft({ ...draft, [key]: '' })}>Reset</button></div>
      {error && <p>Enter a non-negative number.</p>}
    </div>
  }
  const ingredients = [...new Map(build.recipe.craftingComponents.map(c => [c.component.id,c.component])).values()]
  return <section className="build-details">
    <button type="button" className="secondary-button" onClick={onClose}>Back to Build Queue</button>
    <h3>{build.blueprintName}</h3><p>{build.status} · Original: {duration(build.timer.originalDurationMs)} · Remaining: {duration(build.timer.remainingMs)}</p>
    <p>Created: {new Date(build.createdAt).toLocaleString()}<br />Started: {build.startedAt === undefined ? 'Not started' : new Date(build.startedAt).toLocaleString()}<br />Completed: {build.completedAt === undefined ? 'Not completed' : new Date(build.completedAt).toLocaleString()}</p>
    {showTimer && build.status !== 'Completed' && <BuildCraftTimer build={build} blocked={blocked} onToggle={onToggle} onSettings={onTimer} />}
    {showTimer && <button type="button" className="secondary-button" onClick={onTimer}>Open Craft Timer</button>}
    <form onSubmit={event => { event.preventDefault(); if (!invalid && onSave(notes,overrides)) onClose() }}>
      <label htmlFor="build-notes">Notes</label><textarea id="build-notes" rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Who is this for? Materials supplied, payment, or other details…" />
      <h4>Economic Overrides</h4><p>These values belong to this Build only. Reset restores the captured value, even if Settings have since changed.</p>
      {(Object.keys(defaultEconomicsSettings) as EconomicSetting[]).map(key => field(key,labels[key],build.economicSnapshot[key],effective[key]))}
      {ingredients.map(item => field('resource-' + item.id,item.name + ' (cr / unit)',build.economicSnapshot.resourceValues[item.id],effective.resourceValues[item.id]))}
      <div className="build-cost"><strong>Build cost: {credits(cost.productionCost)}</strong><p>Materials: {credits(cost.materialCost)}{cost.hasUnknownComponentCosts ? ' + unknown components' : ''} · Labor: {credits(cost.laborCost)} · Resolve: {credits(cost.resolveCost)}</p>
        {cost.components.map(c => <p key={c.itemId}>{c.name}: {c.quantity} × {credits(c.unitCost)} = {credits(c.totalCost)}</p>)}
        <p>Selling estimate: {cost.productionCost === undefined ? 'Unknown' : credits(calculator.calculateSellingPrice(cost.productionCost,effective.defaultMarkupPercent))}</p></div>
      <div className="build-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={invalid}>Save Build</button></div>
    </form>
  </section>
}
