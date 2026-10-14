import type {Warehouse} from './Warehouse'
import {inventoryItemById} from './InventoryCatalog'
import {csvDocument} from '../../services/files/Csv'
import type {ExportFile,ExportFormat} from '../../services/files/SaveFile'
export function createWarehouseExport(warehouse:Warehouse,format:ExportFormat,now=new Date()):ExportFile{
 const name='workshop-warehouse-'+now.toISOString().slice(0,10)+'.'+format
 const entries=warehouse.entries.map(entry=>({...entry,name:inventoryItemById.get(entry.itemId)?.name??'Unknown Item #'+entry.itemId,kind:inventoryItemById.get(entry.itemId)?.kind??'unavailable',category:inventoryItemById.get(entry.itemId)?.category??'Items'}))
 if(format==='json')return {name,extension:format,mimeType:'application/json',content:JSON.stringify({format:'wasteland-workshop-warehouse',schemaVersion:1,exportedAt:now.toISOString(),warehouse:{credits:warehouse.credits,entries}},null,2)+'\n'}
 return {name,extension:format,mimeType:'text/csv',content:csvDocument([
  ['Record Type','Item ID','Name','Kind','Category','Quantity','Expiration Date','Credits On Hand'],
  ['Credits','','Credits on hand','','','','',warehouse.credits],
  ...entries.map(item=>['Inventory',item.itemId,item.name,item.kind,item.category,item.quantity,item.expirationDate??'',''])
 ])}
}
