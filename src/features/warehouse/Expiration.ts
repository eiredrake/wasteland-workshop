import { inventoryItemById } from './InventoryCatalog'
export function localDate(date = new Date()): string {
  return String(date.getFullYear()).padStart(4,'0')+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')
}
export function validExpirationDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date=new Date(value+'T00:00:00Z')
  return !isNaN(date.getTime()) && date.toISOString().slice(0,10)===value
}
export function daysUntilExpiration(expiration: string, today = localDate()): number {
  return Math.round((Date.parse(expiration+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000)
}
export function expirationStatus(itemId:number, expirationDate:string|undefined, warningDays:number, today=localDate()): 'good'|'expiring'|'expired'|'unknown'|'currency' {
  if (inventoryItemById.get(itemId)?.kind==='currency') return 'currency'
  if (!expirationDate) return 'unknown'
  const days=daysUntilExpiration(expirationDate,today)
  return days<0?'expired':days<=warningDays?'expiring':'good'
}
export function lotKey(itemId:number,expirationDate?:string): string {return itemId+':'+(expirationDate??'unknown')}
export function usableForIngredient(itemId:number,expirationDate:string|undefined,acceptsExpiredWithinDays:number,today=localDate()): boolean {
  if (inventoryItemById.get(itemId)?.kind==='currency') return true
  if (!expirationDate) return false
  return daysUntilExpiration(expirationDate,today)>=-Math.max(0,acceptsExpiredWithinDays)
}
