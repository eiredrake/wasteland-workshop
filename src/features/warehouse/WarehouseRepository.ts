import { isSelectorId } from '../blueprints/IngredientCatalog'
import { userStorage } from '../backup/UserStorage'
import { lotKey, validExpirationDate } from './Expiration'
import { emptyWarehouse, type Warehouse } from './Warehouse'
import { validInventoryAmount } from './WarehouseService'
import { inventoryItemById } from './InventoryCatalog'
export const WAREHOUSE_STORAGE_KEY = 'wasteland-workshop-warehouse'
export function loadWarehouse(storage: Pick<Storage,'getItem'> = userStorage): Warehouse {
  const raw = storage.getItem(WAREHOUSE_STORAGE_KEY)
  if (!raw) return emptyWarehouse()
  const data = JSON.parse(raw)
  if (!data || (data.version !== 1 && data.version !== 2) || !validInventoryAmount(data.credits) || !Array.isArray(data.entries)
    || !data.entries.every((entry: {itemId?: unknown;quantity?: unknown;expirationDate?:unknown} | null) => entry && Number.isSafeInteger(entry.itemId)
      && (entry.itemId as number) > 0 && !isSelectorId(entry.itemId as number) && validInventoryAmount(entry.quantity) && entry.quantity > 0
      && (entry.expirationDate===undefined || (validExpirationDate(entry.expirationDate) && inventoryItemById.get(entry.itemId as number)?.kind!=='currency')))
    || new Set(data.entries.map((entry: {itemId:number;expirationDate?:string}) => lotKey(entry.itemId,entry.expirationDate))).size !== data.entries.length) throw new Error('Saved Warehouse data is invalid or unsupported.')
  return {credits:data.credits,entries:data.entries}
}
export function saveWarehouse(warehouse: Warehouse, storage: Pick<Storage,'setItem'> = userStorage) {
  storage.setItem(WAREHOUSE_STORAGE_KEY,JSON.stringify({version:2,...warehouse}))
}
