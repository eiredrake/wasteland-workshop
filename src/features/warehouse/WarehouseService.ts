import { validExpirationDate } from './Expiration'
import { inventoryItemById } from './InventoryCatalog'
import type { Warehouse } from './Warehouse'
export function validInventoryAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
}
function checkAmount(value: number) { if (!validInventoryAmount(value)) throw new Error('Enter a non-negative quantity within the supported range.') }
export function quantityOnHand(warehouse: Warehouse, itemId: number): number { return warehouse.entries.filter(entry => entry.itemId === itemId).reduce((sum,entry)=>sum+entry.quantity,0) }
export function setInventoryQuantity(warehouse: Warehouse, itemId: number, quantity: number, expirationDate?: string): Warehouse {
  if (!inventoryItemById.has(itemId) && !warehouse.entries.some(entry => entry.itemId === itemId)) throw new Error('Choose a concrete item from the Warehouse catalog.')
  checkAmount(quantity)
  if (expirationDate !== undefined && (!validExpirationDate(expirationDate) || inventoryItemById.get(itemId)?.kind === 'currency')) throw new Error('Enter a valid expiration date for a non-currency item.')
  const entries = warehouse.entries.filter(entry => entry.itemId !== itemId || entry.expirationDate !== expirationDate)
  if (quantity > 0) entries.push({itemId,quantity,...(expirationDate ? {expirationDate} : {})})
  return {...warehouse,entries}
}
export function addInventoryQuantity(warehouse: Warehouse, itemId: number, quantity: number, expirationDate?: string): Warehouse {
  checkAmount(quantity)
  return setInventoryQuantity(warehouse,itemId,lotQuantity(warehouse,itemId,expirationDate)+quantity,expirationDate)
}
export function subtractInventoryQuantity(warehouse: Warehouse, itemId: number, quantity: number, expirationDate?: string): Warehouse {
  checkAmount(quantity)
  const next = lotQuantity(warehouse,itemId,expirationDate)-quantity
  if (next < 0) throw new Error('You do not have that many on hand.')
  return setInventoryQuantity(warehouse,itemId,next,expirationDate)
}
export function changeCredits(warehouse: Warehouse, action: 'set' | 'add' | 'subtract', amount: number): Warehouse {
  checkAmount(amount)
  const credits = action === 'set' ? amount : action === 'add' ? warehouse.credits + amount : warehouse.credits - amount
  if (credits < 0) throw new Error('Credits cannot go below zero.')
  checkAmount(credits)
  return {...warehouse,credits}
}

export function lotQuantity(warehouse:Warehouse,itemId:number,expirationDate?:string):number {
  return warehouse.entries.find(entry=>entry.itemId===itemId&&entry.expirationDate===expirationDate)?.quantity??0
}
export function changeInventoryExpiration(warehouse:Warehouse,itemId:number,previousDate:string|undefined,newDate:string):Warehouse {
  const quantity=lotQuantity(warehouse,itemId,previousDate)
  if (quantity===0) throw new Error('That inventory lot no longer exists.')
  if (previousDate===newDate) return warehouse
  const removed=setInventoryQuantity(warehouse,itemId,0,previousDate)
  return addInventoryQuantity(removed,itemId,quantity,newDate)
}
