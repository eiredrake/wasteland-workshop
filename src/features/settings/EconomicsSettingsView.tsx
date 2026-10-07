import { useState } from 'react'
import { defaultEconomicsSettings, resolveEconomicsSettings, validEconomicValue,
  type EconomicSetting, type EconomicsOverrides } from '../../economics/EconomicsSettings'
import { getEconomicResourceDefinitions } from '../../economics/EconomicResourceCatalog'
import { getEffectiveResourceValue } from '../../economics/ResourceValuationService'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { allBlueprints } from '../blueprints/blueprints'
import './EconomicsSettingsView.css'

const definitions = getEconomicResourceDefinitions(allBlueprints)
const valuationGroups = [
  { title: 'Currency', key: 'currency' },
  { title: 'Herbs', key: 'herbs' },
  { title: 'Scrap', key: 'scrap' },
  { title: 'Other Resources', key: 'other' },
]
function valuationGroup(itemId: number) {
  const kind = ingredientItems.get(itemId)?.kind
  if (kind === 'currency') return 'currency'
  if (kind === 'named_herb' || kind === 'unnamed_herb') return 'herbs'
  if (kind === 'unnamed_scrap') return 'scrap'
  return 'other'
}
const formatValue = (value: number | undefined) => value === undefined ? 'Unknown' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const groups: { title: string; fields: { key: EconomicSetting; label: string; unit: string }[] }[] = [
  { title: 'Labor', fields: [
    { key: 'mindCostPerPoint', label: 'Mind', unit: 'cr / Mind' },
    { key: 'timeCostPerMinute', label: 'Time', unit: 'cr / minute' },
  ] },
  { title: 'Character Resources', fields: [{ key: 'resolveCostPerPoint', label: 'Resolve', unit: 'cr / Resolve' }] },
  { title: 'Acquisition Resources', fields: [{ key: 'foragingCardCost', label: 'Foraging Card', unit: 'cr / card' }] },
  { title: 'Selling Price', fields: [{ key: 'defaultMarkupPercent', label: 'Default markup', unit: '%' }] },
]

export default function EconomicsSettingsView({ currentOverrides, onSave }: {
  currentOverrides: EconomicsOverrides
  onSave: (overrides: EconomicsOverrides) => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {}
    for (const key of Object.keys(defaultEconomicsSettings) as EconomicSetting[]) {
      if (currentOverrides[key] !== undefined) values[key] = String(currentOverrides[key])
    }
    for (const [id, value] of Object.entries(currentOverrides.resourceValues ?? {})) values[`resource-${id}`] = String(value)
    return values
  })
  const [filter, setFilter] = useState('')
  const overrides: EconomicsOverrides = { resourceValues: {} }
  let invalid = false
  for (const [key, text] of Object.entries(draft)) {
    if (!text.trim()) continue
    const value = Number(text)
    if (!validEconomicValue(value)) { invalid = true; continue }
    if (key.startsWith('resource-')) overrides.resourceValues![Number(key.slice(9))] = value
    else overrides[key as EconomicSetting] = value
  }
  const effective = resolveEconomicsSettings(overrides)
  const calculator = new DefaultCostCalculator(overrides)
  const field = (key: string, label: string, unit: string, defaultValue: number | undefined, effectiveValue: number | undefined) => {
    const text = draft[key] ?? ''
    const hasOverride = text.trim() !== ''
    const error = hasOverride && !validEconomicValue(Number(text))
    return <div className="settings-row economics-value-row" key={key}>
      <div><label htmlFor={`economic-${key}`}>{label}</label>
        <p className="economics-value-summary" id={`economic-${key}-summary`}>
          Default: {formatValue(defaultValue)} · Effective: {error ? 'Invalid' : formatValue(effectiveValue)} {unit}
          <br />{error ? 'Enter a non-negative number.' : hasOverride ? 'User override' : defaultValue === undefined ? 'No shipped valuation; enter a value if known.' : 'Using application default'}
        </p>
      </div>
      <div className="settings-input economics-override-input">
        <input id={`economic-${key}`} type="number" inputMode="decimal" min="0" max={Number.MAX_SAFE_INTEGER} step="any"
          aria-describedby={`economic-${key}-summary`} aria-invalid={error || undefined}
          placeholder={defaultValue === undefined ? 'Unknown' : String(defaultValue)} value={text}
          onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
        <button type="button" className="secondary-button" disabled={!hasOverride} aria-label={`Reset ${label} to default`}
          onClick={() => setDraft({ ...draft, [key]: '' })}>Reset</button>
      </div>
    </div>
  }

  return <section className="settings-page economics-settings-page">
    <div className="settings-header"><h2>Economics Settings</h2>
      <p>Override the values used throughout Wasteland Workshop. Leave an override blank or reset it to use the default.</p>
    </div>
    <form onSubmit={event => { event.preventDefault(); if (!invalid) onSave(overrides) }}>
      {groups.map(group => <div className="settings-card" key={group.title}><h3>{group.title}</h3>
        {group.fields.map(({ key, label, unit }) => field(key, label, unit, defaultEconomicsSettings[key], effective[key]))}
        {group.title === 'Acquisition Resources' && <p className="economics-note">One card value applies to every foraging tier. Tier-specific acquisition methods are retained.</p>}
      </div>)}
      <div className="economics-resource-valuations"><h3>Resource Valuations</h3>
        <p className="economics-note">Ayden’s Econtism defaults are fixed resource values used for blueprint materials and shopping estimates. Acquisition costs are separate. Save an override to use your value throughout the app; reset it to restore the application default. Unmapped resources remain unknown.</p>
        <label htmlFor="economic-resource-filter">Find a resource value</label>
        <input className="economics-resource-filter" id="economic-resource-filter" type="search" value={filter}
          placeholder="Herbs, scrap, crystals…" onChange={event => setFilter(event.target.value)} />
        {valuationGroups.map(group => {
          const resources = definitions.filter(resource => valuationGroup(resource.itemId) === group.key
            && resource.name.toLowerCase().includes(filter.trim().toLowerCase()))
          if (!resources.length) return null
          return <section className={`settings-card economics-resource-group economics-resource-group-${group.key}`} key={group.key}>
            <h3>{group.title}</h3>
            {resources.map(resource => field(`resource-${resource.itemId}`, resource.name, 'cr / unit', resource.defaultValue,
              getEffectiveResourceValue(resource.itemId, calculator)))}
          </section>
        })}
        {!definitions.some(resource => resource.name.toLowerCase().includes(filter.trim().toLowerCase())) && <p>No matching resources.</p>}
      </div>
      <div className="settings-actions">
        <button type="button" className="secondary-button" onClick={() => setDraft({})}>Restore Defaults</button>
        <button type="submit" className="primary-button" disabled={invalid}>Save Settings</button>
      </div>
    </form>
  </section>
}
