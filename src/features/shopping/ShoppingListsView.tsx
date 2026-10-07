import { useEffect, useRef, useState, type PointerEvent } from 'react'
import ShoppingConfirmationDialog from './ShoppingConfirmationDialog'
import SearchablePicker from '../../components/SearchablePicker/SearchablePicker'
import Datalist from '../../components/Datalist/Datalist'
import type { CostCalculator } from '../../economics/CostCalculator'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import { allBlueprints } from '../blueprints/blueprints'
import type { BlueprintAccessStatus, BlueprintCollection } from '../blueprints/BlueprintCollection'
import type { BlueprintAcquisitionItem, ResourceShoppingItem, ShoppingListState } from './ShoppingList'
import { exportShoppingList, parseShoppingListImport } from './ShoppingListRepository'
import { addResources, addShoppingList, deleteShoppingList, getBlueprintAcquisitions, getResourceCatalog, removeResource, renameShoppingList, replaceShoppingList, selectShoppingList, toggleResource, valueShoppingList, type ValuedResource } from './ShoppingListService'
import '../blueprints/BlueprintCollectionsView.css'
import './ShoppingLists.css'

const resourceCatalog = getResourceCatalog(allBlueprints, testResourceEconomics)
const credits = (value: number | undefined) => value === undefined ? 'Unknown' : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}cr`

function AcquisitionControl({ item, onToggle, onRemove }: {
  item: ResourceShoppingItem; onToggle: () => void; onRemove: () => void
}) {
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const origin = useRef({ x: 0, y: 0 })
  const held = useRef(false)
  const cancel = () => { clearTimeout(hold.current); hold.current = undefined }
  useEffect(() => () => clearTimeout(hold.current), [])
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    cancel()
    held.current = false
    origin.current = { x: event.clientX, y: event.clientY }
    hold.current = setTimeout(() => { held.current = true; onRemove() }, 650)
  }
  return <div className="shopping-row-actions shopping-status-badges">
    <button type="button" className={`blueprint-access-status blueprint-access-status-${item.acquired ? 'acquired' : 'to-acquire'}`}
      aria-label={`${item.acquired ? 'Acquired' : 'Needed'}: ${item.name}. Tap to toggle; hold to remove.`} aria-pressed={item.acquired}
      onPointerDown={start} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onPointerMove={event => { if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) cancel() }}
      onContextMenu={event => event.preventDefault()}
      onClick={() => { if (!held.current) onToggle(); held.current = false }}>
      {item.acquired ? 'Acquired' : 'Needed'}
    </button>
    <button className="blueprint-access-status blueprint-access-status-untracked shopping-remove-badge" type="button" aria-label={`Remove ${item.name}`} title="Remove ingredient from this shopping list" onClick={onRemove}>X</button>
  </div>
}

export default function ShoppingListsView({ state, onChange, calculator, activeCollection, onUpdateBlueprint, notify }: {
  state: ShoppingListState
  onChange: (state: ShoppingListState) => boolean
  calculator: CostCalculator
  activeCollection: BlueprintCollection | undefined
  onUpdateBlueprint: (id: number, name: string, status: BlueprintAccessStatus | undefined) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [pendingResource, setPendingResource] = useState<{ item: ResourceShoppingItem; listId: string }>()
  const [pendingBlueprint, setPendingBlueprint] = useState<BlueprintAcquisitionItem>()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [renameId, setRenameId] = useState<string>()
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseShoppingListImport>>()
  const [resourceId, setResourceId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const input = useRef<HTMLInputElement>(null)
  const active = state.lists.find(list => list.id === state.activeListId)
  const valued = active ? valueShoppingList(active, calculator) : undefined
  const blueprints = getBlueprintAcquisitions(activeCollection, allBlueprints)

  const commit = (next: ShoppingListState, message: string) => {
    if (!onChange(next)) return false
    notify(message)
    return true
  }
  const cancelName = () => { setAdding(false); setRenameId(undefined); setPendingImport(undefined); setName('') }
  const saveName = () => {
    try {
      const next = renameId ? renameShoppingList(state, renameId, name) : addShoppingList(state, name, pendingImport?.items)
      if (commit(next, renameId ? 'Shopping list renamed.' : pendingImport ? 'Shopping list imported.' : 'Shopping list created.')) cancelName()
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to save list.', true) }
  }
  const remove = (item: ResourceShoppingItem) => {
    if (active) setPendingResource({ item, listId: active.id })
  }

  return <section className="blueprint-collections-page shopping-page">
    <header className="blueprint-collections-header">
      <div><h2>Shopping Lists</h2><p>Plan purchases, track acquisitions, and estimate remaining cost.</p></div>
      <div className="blueprint-collection-card-actions">
        <button type="button" className="secondary-button" onClick={() => input.current?.click()}>Import List</button>
        <button type="button" className="primary-button" onClick={() => { cancelName(); setAdding(true) }}>Add List</button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={async event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          try {
            const imported = parseShoppingListImport(await file.text())
            cancelName(); setPendingImport(imported); setName(imported.name)
          } catch { notify('That file is not a valid supported Wasteland Workshop shopping list. Nothing was imported.', true) }
        }} />
      </div>
    </header>

    {(adding || renameId || pendingImport) && <form className="blueprint-collection-add" onSubmit={event => { event.preventDefault(); saveName() }}>
      <label htmlFor="shopping-list-name">{renameId ? 'Rename List' : pendingImport ? 'Imported List Name' : 'List Name'}</label>
      <input id="shopping-list-name" value={name} maxLength={200} autoFocus required onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') cancelName() }} />
      {pendingImport && <p>{pendingImport.items.length} ingredient rows found. Import creates a new list.</p>}
      <div className="blueprint-collection-add-actions">
        <button type="button" className="secondary-button" onClick={cancelName}>Cancel</button>
        <button type="submit" className="primary-button" disabled={!name.trim()}>{pendingImport ? 'Import List' : 'Save List'}</button>
      </div>
    </form>}

    <div className="blueprint-collections-list shopping-list-cards">
      {state.lists.map(list => <div key={list.id} className={`blueprint-collection-card${list.id === state.activeListId ? ' blueprint-collection-card-active' : ''}`}>
        <div className="blueprint-collection-card-header"><div><h3>{list.name}</h3><p>{list.items.filter(item => !item.acquired).length} needed · {list.items.filter(item => item.acquired).length} acquired</p></div>
          {list.id === state.activeListId && <span className="blueprint-collection-active-badge">Active</span>}
        </div>
        <div className="blueprint-collection-card-actions">
          {list.id !== state.activeListId && <button type="button" className="secondary-button" onClick={() => commit(selectShoppingList(state, list.id), `"${list.name}" is the active shopping list.`)}>Set Active</button>}
          <button type="button" className="secondary-button" onClick={() => { cancelName(); setRenameId(list.id); setName(list.name) }}>Rename</button>
          <button type="button" className="secondary-button" onClick={() => {
            const url = URL.createObjectURL(new Blob([exportShoppingList(list)], { type: 'application/json' }))
            const link = document.createElement('a')
            link.href = url; link.download = `${list.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'shopping-list'}.json`
            document.body.appendChild(link); link.click(); link.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}>Export</button>
          <button type="button" className="secondary-button" onClick={() => {
            if (window.confirm(`Delete "${list.name}"?\n\nThis cannot be undone. Blueprint Collection statuses are kept.`)) commit(deleteShoppingList(state, list.id), 'Shopping list deleted.')
          }}>Delete</button>
        </div>
      </div>)}
    </div>

    {!active && <div className="blueprint-collections-empty"><h3>{state.lists.length ? 'Select an Active List' : 'No Shopping Lists'}</h3>
      <p>{state.lists.length ? 'Tap Set Active to choose the list receiving resources and blueprint components.' : 'Create or import your first list. It will become active automatically.'}</p>
    </div>}

    {active && valued && <>
      <h3 className="shopping-active-heading">Resources · {active.name}</h3>
      <div className="shopping-summary" role="status"><strong>Estimated remaining: {credits(valued.remainingValue)}{valued.unknownNeeded ? ' + unknown values' : ''}</strong>
        <p>{valued.unknownNeeded ? `${valued.unknownNeeded} needed ingredient row(s) have unknown value. ` : ''}Acquired rows and blueprint prints are excluded. Estimates use Economics Settings.</p>
      </div>
      <form className="blueprint-collection-add shopping-add-resource" onSubmit={event => {
        event.preventDefault()
        const resource = resourceCatalog.find(item => String(item.resourceId) === resourceId)
        if (!resource) { notify('Choose a resource first.', true); return }
        try {
          const next = addResources(active, [{ ...resource, quantity: Number(quantity) }])
          if (commit(replaceShoppingList(state, next), `Added ${quantity} × ${resource.name}.`)) setQuantity('1')
        } catch (error) { notify(error instanceof Error ? error.message : 'Unable to add resource.', true) }
      }}>
        <SearchablePicker label="Find a Resource" options={resourceCatalog} required
          getOptionKey={resource => resource.resourceId} getOptionLabel={resource => resource.name}
          placeholder="Scrap, herbs, metals…" onChange={resource => setResourceId(resource ? String(resource.resourceId) : '')} />
        <div className="shopping-quantity-input"><label htmlFor="shopping-quantity">Quantity</label>
          <input id="shopping-quantity" type="number" inputMode="decimal" min="0.000001" step="any" required value={quantity} onChange={event => setQuantity(event.target.value)} />
          <button type="submit" className="primary-button" disabled={!resourceId}>Add Resource</button>
        </div>
        <p className="shopping-hint">Duplicates merge. Adding to an acquired row marks the combined quantity Needed again.</p>
      </form>
      <div className="shopping-resources"><Datalist<ValuedResource> items={valued.items} getRowKey={item => item.resourceId}
        emptyMessage="No resources yet. Add one above or add components from Blueprint Details."
        columns={[
          { key: 'name', label: 'Resource / Quantity / Value', protected: true, minWidth: 150, render: item => <div className={item.acquired ? 'shopping-resource-acquired' : ''}>
            <strong>{item.name}</strong>{item.kind === 'requirement' && <span className="shopping-resource-value">Ingredient choice · Choice not yet selected</span>}<span className="shopping-resource-value">Qty {item.quantity.toLocaleString()} · Unit {credits(item.unitValue)}<br />Total {credits(item.totalValue)}</span>
          </div> },
          { key: 'acquired', label: 'Status', protected: true, minWidth: 90, render: item => <AcquisitionControl item={item}
            onToggle={() => commit(replaceShoppingList(state, toggleResource(active, item.resourceId)), `${item.name} marked ${item.acquired ? 'Needed' : 'Acquired'}.`)} onRemove={() => remove(item)} /> },
        ]} /></div>
      <p className="shopping-hint">Tap a status to toggle Needed/Acquired. Hold it to remove, or tap X.</p>
    </>}

    <section className="shopping-blueprints"><h3>Blueprints to Acquire</h3>
      <p>{activeCollection ? `Live from "${activeCollection.name}", your active Blueprint Collection. These targets appear with every shopping list; changing their status updates the collection.` : 'Select an active Blueprint Collection to see its To Acquire prints here.'}</p>
      <Datalist items={blueprints} getRowKey={item => item.blueprintId} emptyMessage="No blueprints to acquire in the active collection."
        columns={[
          { key: 'name', label: 'Blueprint / Print', protected: true, render: item => <strong>{item.name}</strong> },
          { key: 'blueprintId', label: 'Acquisition', protected: true, render: item => <div className="shopping-row-actions shopping-status-badges">
            <button type="button" className="blueprint-access-status blueprint-access-status-to-acquire" aria-label={`Mark ${item.name} acquired`}
              onClick={() => onUpdateBlueprint(item.blueprintId, item.name, 'acquired')}>To Acquire</button>
            <button type="button" className="blueprint-access-status blueprint-access-status-untracked shopping-remove-badge"
              aria-label={`Stop tracking ${item.name}`} title="Remove from the active Blueprint Collection"
              onClick={() => setPendingBlueprint(item)}>X</button>
          </div> },
        ]} />
    </section>
    {pendingResource && <ShoppingConfirmationDialog title="Remove resource?"
      message={`Remove "${pendingResource.item.name}" from "${state.lists.find(list => list.id === pendingResource.listId)?.name ?? 'this shopping list'}"?`}
      onCancel={() => setPendingResource(undefined)} onConfirm={() => {
        const list = state.lists.find(list => list.id === pendingResource.listId)
        if (list && !commit(replaceShoppingList(state, removeResource(list, pendingResource.item.resourceId)), 'Resource removed.')) return
        setPendingResource(undefined)
      }} />}
    {pendingBlueprint && <ShoppingConfirmationDialog title="Remove blueprint?"
      message={`Remove "${pendingBlueprint.name}" from "${activeCollection?.name ?? 'the active Blueprint Collection'}"? This also removes it from Blueprints to Acquire.`}
      onCancel={() => setPendingBlueprint(undefined)} onConfirm={() => {
        if (activeCollection?.id === pendingBlueprint.collectionId) {
          onUpdateBlueprint(pendingBlueprint.blueprintId, pendingBlueprint.name, undefined)
        }
        setPendingBlueprint(undefined)
      }} />}
  </section>
}
