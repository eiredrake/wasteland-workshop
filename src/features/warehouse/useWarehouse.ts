import { useRef, useState } from 'react'
import { emptyWarehouse, type Warehouse } from './Warehouse'
import { loadWarehouse, saveWarehouse } from './WarehouseRepository'
export function useWarehouse(notify: (message: string) => void) {
  const [initial] = useState(() => {
    try { return {warehouse:loadWarehouse(),error:''} }
    catch { return {warehouse:emptyWarehouse(),error:'Saved Warehouse could not be read. Stored data has been kept; inventory changes are disabled.'} }
  })
  const [warehouse,setWarehouse] = useState(initial.warehouse)
  const current = useRef(warehouse)
  function apply(operation: (warehouse: Warehouse) => Warehouse): boolean {
    if (initial.error) { notify(initial.error); return false }
    try { const next = operation(current.current); saveWarehouse(next); current.current=next; setWarehouse(next); return true }
    catch (error) { notify(error instanceof Error ? error.message : 'Warehouse could not be saved. Your previous inventory was kept.'); return false }
  }
  return {warehouse,apply,error:initial.error}
}
