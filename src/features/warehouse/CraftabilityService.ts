import { localDate, usableForIngredient } from './Expiration'
import type { ItemCrafting } from '../blueprints/ItemCrafting'
import { concreteIngredients } from '../blueprints/IngredientRequirement'
import type { Warehouse } from './Warehouse'
export type MissingIngredient = { itemId: number; name: string; quantity: number; choice: boolean }
// Maximum flow prevents one owned item satisfying multiple overlapping requirements.
// Reverse edges allow an early assignment to move when a more specific requirement needs it.
function allocate(recipe: ItemCrafting, warehouse: Warehouse, copies: number, today: string) {
  const requirements = recipe.craftingComponents.filter(c => c.amount > 0)
  const stock = warehouse.entries.filter(entry => entry.quantity > 0)
  const size = stock.length + requirements.length + 2, sink = size-1
  const capacities = Array.from({length:size},() => new Map<number,number>())
  function edge(a: number,b: number,capacity: number) { capacities[a].set(b,capacity); capacities[b].set(a,0) }
  stock.forEach((entry,i) => edge(0,i+1,entry.quantity))
  requirements.forEach((component,j) => {
    const node = stock.length+1+j, demand = component.amount*copies
    edge(node,sink,demand)
    const options = new Set(concreteIngredients(component.component).map(item => item.id))
    stock.forEach((entry,i) => { if (options.has(entry.itemId) && usableForIngredient(entry.itemId,entry.expirationDate,component.acceptsExpiredItemWithinDays,today)) edge(i+1,node,Math.min(entry.quantity,demand)) })
  })
  while (true) {
    const parents = Array<number>(size).fill(-1), queue=[0]; parents[0]=0
    for (let i=0;i<queue.length && parents[sink]<0;i++) for (const [next,capacity] of capacities[queue[i]]) {
      if (capacity > 0 && parents[next]<0) {parents[next]=queue[i]; queue.push(next)}
    }
    if (parents[sink]<0) break
    let amount=Infinity
    for (let node=sink;node!==0;node=parents[node]) amount=Math.min(amount,capacities[parents[node]].get(node)!)
    for (let node=sink;node!==0;node=parents[node]) {const parent=parents[node]; capacities[parent].set(node,capacities[parent].get(node)!-amount); capacities[node].set(parent,capacities[node].get(parent)!+amount)}
  }
  return requirements.map((component,j) => ({itemId:component.component.id,name:component.component.name,
    choice:component.component.kind==='taxonomy',quantity:capacities[stock.length+1+j].get(sink)!})).filter((item,index) => item.quantity > Number.EPSILON * requirements[index].amount * copies * 16)
}
export function blueprintCraftability(recipe: ItemCrafting, warehouse: Warehouse, today = localDate()): {materialsAvailable:boolean;maxCopies:number|null;missing:MissingIngredient[]} {
  if (recipe.craftingComponents.some(c => !Number.isFinite(c.amount) || c.amount < 0)) throw new Error('Invalid recipe material quantity.')
  const requirements=recipe.craftingComponents.filter(c => c.amount>0)
  if (!requirements.length) return {materialsAvailable:true,maxCopies:null,missing:[]}
  const missing=allocate(recipe,warehouse,1,today)
  if (missing.length) return {materialsAvailable:false,maxCopies:0,missing}
  const smallest=Math.min(...requirements.map(c=>c.amount))
  let lower=1, upper=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(warehouse.entries.reduce((sum,e)=>sum+e.quantity,0)/smallest))
  while (lower<upper) {const middle=lower+Math.ceil((upper-lower)/2); if (allocate(recipe,warehouse,middle,today).length===0) lower=middle; else upper=middle-1}
  return {materialsAvailable:true,maxCopies:lower,missing:[]}
}
