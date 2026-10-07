export type InventoryEntry = { itemId: number; quantity: number; expirationDate?: string }
export type Warehouse = { entries: InventoryEntry[]; credits: number }
export const emptyWarehouse = (): Warehouse => ({entries: [],credits: 0})
