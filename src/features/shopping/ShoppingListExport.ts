import type {ShoppingList,BlueprintAcquisitionItem} from './ShoppingList'
import type {BlueprintCollection} from '../blueprints/BlueprintCollection'
import type {CostCalculator} from '../../economics/CostCalculator'
import {valueShoppingList} from './ShoppingListService'
import {exportShoppingList} from './ShoppingListRepository'
import {csvDocument} from '../../services/files/Csv'
import type {ExportFile,ExportFormat} from '../../services/files/SaveFile'
export function createShoppingListExport(list:ShoppingList,blueprints:BlueprintAcquisitionItem[],collection:BlueprintCollection|undefined,calculator:CostCalculator,format:ExportFormat,now=new Date()):ExportFile{
 const safeName=list.name.trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'')||'shopping-list'
 const name='workshop-shopping-'+safeName.slice(0,80)+'-'+now.toISOString().slice(0,10)+'.'+format
 if(format==='json')return {name,extension:format,mimeType:'application/json',content:JSON.stringify({...JSON.parse(exportShoppingList(list)),exportedAt:now.toISOString(),blueprintCollection:collection?{id:collection.id,name:collection.name}:null,blueprintsToAcquire:blueprints},null,2)+'\n'}
 const valued=valueShoppingList(list,calculator)
 return {name,extension:format,mimeType:'text/csv',content:csvDocument([
  ['List','Kind','ID','Name','Quantity','Status','Unit Value (credits)','Total Value (credits)','Blueprint Collection','Requirement (JSON)'],
  ...valued.items.map(item=>[list.name,item.kind,item.resourceId,item.name,item.quantity,item.acquired?'Acquired':'Needed',item.unitValue,item.totalValue,'',item.requirement]),
  ...blueprints.map(item=>[list.name,'blueprint',item.blueprintId,item.name,1,'To Acquire','','',collection?.name??item.collectionId,''])
 ])}
}
