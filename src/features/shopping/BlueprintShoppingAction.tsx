import QuantitySplitButton from '../../components/QuantitySelection/QuantitySplitButton'
import {alphabeticalOptions} from '../../components/OptionOrder'
import { useState } from 'react'
import type { Blueprint } from '../blueprints/Blueprint'
import type { ShoppingList } from './ShoppingList'
import './ShoppingLists.css'

export type BlueprintShoppingProps = {
  lists: ShoppingList[]
  activeListId?: string
  onAddComponents: (blueprint: Blueprint, listId: string, quantity?: number) => boolean
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
        {alphabeticalOptions(shopping.lists,list=>list.name).map(list => <option key={list.id} value={list.id}>{list.name}{list.id === shopping.activeListId ? ' (Active)' : ''}</option>)}
      </select>
      <QuantitySplitButton title="Add ingredients to Shopping List" name={blueprint.name} quantityLabel="Choose shopping list quantity" disabled={!targetId || !hasComponents}
        onAdd={quantity => shopping.onAddComponents(blueprint, targetId, quantity)}>Add All Components</QuantitySplitButton>
      {!hasComponents && <p>No required components are listed for this blueprint.</p>}
      <p>Duplicates merge. The selected list becomes active. Tap adds one recipe; hold or use the arrow to choose 1–10 copies. Acquired rows receiving more components become Needed.</p>
    </> : <p>Create a shopping list first, then return here to add this recipe.</p>}
    <button type="button" className="secondary-button" onClick={shopping.onOpenLists}>{shopping.lists.length ? 'Manage Shopping Lists' : 'Create or Import a Shopping List'}</button>
  </section>
}
