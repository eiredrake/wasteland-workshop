import { useState } from 'react'
import type { Blueprint } from '../blueprints/Blueprint'
import type { ShoppingList } from './ShoppingList'
import './ShoppingLists.css'

export type BlueprintShoppingProps = {
  lists: ShoppingList[]
  activeListId?: string
  onAddComponents: (blueprint: Blueprint, listId: string) => boolean
  onOpenLists: () => void
}

export default function BlueprintShoppingAction({ blueprint, shopping }: { blueprint: Blueprint; shopping: BlueprintShoppingProps }) {
  const [selectedId, setSelectedId] = useState('')
  const targetId = selectedId || shopping.activeListId || ''
  const hasComponents = Boolean(blueprint.itemCraftings?.[0]?.craftingComponents.length)
  return <section className="blueprint-details-card shopping-blueprint-action">
    <h3>Add Components to Shopping List</h3>
    {shopping.lists.length ? <>
      <label htmlFor="blueprint-shopping-target">Shopping List</label>
      <select id="blueprint-shopping-target" value={targetId} onChange={event => setSelectedId(event.target.value)}>
        <option value="">Select a list</option>
        {shopping.lists.map(list => <option key={list.id} value={list.id}>{list.name}{list.id === shopping.activeListId ? ' (Active)' : ''}</option>)}
      </select>
      <button type="button" className="primary-button" disabled={!targetId || !hasComponents}
        onClick={() => shopping.onAddComponents(blueprint, targetId)}>Add All Components</button>
      {!hasComponents && <p>No required components are listed for this blueprint.</p>}
      <p>Duplicates merge. The selected list becomes active. Adds one complete recipe; acquired rows receiving more components become Needed.</p>
    </> : <p>Create a shopping list first, then return here to add this recipe.</p>}
    <button type="button" className="secondary-button" onClick={shopping.onOpenLists}>{shopping.lists.length ? 'Manage Shopping Lists' : 'Create or Import a Shopping List'}</button>
  </section>
}
