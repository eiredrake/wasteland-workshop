import {expect,it} from 'vitest'
import {createWarehouseExport} from '../../features/warehouse/WarehouseExport'
import {createShoppingListExport} from '../../features/shopping/ShoppingListExport'
import {parseShoppingListImport} from '../../features/shopping/ShoppingListRepository'
import {DefaultCostCalculator} from '../../economics/DefaultCostCalculator'
import type {ShoppingList} from '../../features/shopping/ShoppingList'
const now=new Date('2026-10-14T12:00:00Z')
it('warehouse retains separate dated, expired, undated and unavailable lots plus credits without mutation',()=>{
 const warehouse={credits:12.5,entries:[{itemId:3866,quantity:2,expirationDate:'2020-01-01'},{itemId:3866,quantity:3,expirationDate:'2030-01-01'},{itemId:99999999,quantity:4}]},before=structuredClone(warehouse)
 const data=JSON.parse(createWarehouseExport(warehouse,'json',now).content)
 expect(data.warehouse.credits).toBe(12.5);expect(data.warehouse.entries).toHaveLength(3)
 expect(data.warehouse.entries[2]).toMatchObject({itemId:99999999,name:'Unknown Item #99999999',quantity:4})
 const csv=createWarehouseExport(warehouse,'csv',now).content
 expect(csv).toContain('"2020-01-01"');expect(csv).toContain('"12.5"');expect(warehouse).toEqual(before)
})
it('empty warehouse exports the zero balance in both formats',()=>{
 const warehouse={credits:0,entries:[]}
 expect(JSON.parse(createWarehouseExport(warehouse,'json',now).content).warehouse).toEqual(warehouse)
 expect(createWarehouseExport(warehouse,'csv',now).content.split('\r\n')).toHaveLength(3)
})
it('shopping JSON remains import-compatible and includes blueprint targets separately',()=>{
 const list:ShoppingList={id:'a',name:'Supplies',items:[{kind:'resource',resourceId:3866,name:'Basic Scrap',quantity:2,acquired:true}]}
 const targets=[{kind:'blueprint' as const,blueprintId:4407,collectionId:'c',name:'Hooch'}],collection={id:'c',name:'Library',entries:[]},before=structuredClone(list)
 const file=createShoppingListExport(list,targets,collection,new DefaultCostCalculator(),'json',now)
 expect(parseShoppingListImport(file.content)).toMatchObject({name:list.name,items:list.items})
 expect(JSON.parse(file.content).blueprintsToAcquire).toEqual(targets);expect(list).toEqual(before)
})
it('shopping CSV retains acquired/needed, unknown values, choice data and safe text',()=>{
 const list:ShoppingList={id:'a',name:'=Supplies',items:[{kind:'resource',resourceId:3866,name:'Basic Scrap',quantity:2,acquired:true},{kind:'resource',resourceId:99999999,name:'Missing',quantity:1,acquired:false},{kind:'requirement',resourceId:99999998,name:'Choice',quantity:3,acquired:false,requirement:{kind:'choice',selectorId:99999998,label:'Choice',options:[]}}]}
 const csv=createShoppingListExport(list,[],undefined,new DefaultCostCalculator(),'csv',now).content
 expect(csv).toContain('Acquired');expect(csv).toContain('Needed');expect(csv).toContain('""selectorId"":99999998')
 expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain(String.fromCharCode(34,39)+'=Supplies')
 expect(csv).not.toContain('undefined');expect(csv).not.toContain('NaN')
})
