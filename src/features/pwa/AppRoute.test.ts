import {describe,it,expect} from 'vitest'
import {appRoute,readAppRoute,appViews} from './AppRoute'
describe('offline-safe navigation',()=>{
 it('round trips every existing section without changing storage',()=>{for(const view of appViews)expect(readAppRoute(appRoute(view)).view).toBe(view)})
 it('restores blueprint details after refresh',()=>{expect(readAppRoute(appRoute('catalog',5328))).toEqual({view:'catalog',blueprintId:5328})})
 it('defaults unknown sections and rejects invalid blueprint IDs',()=>{expect(readAppRoute('#/unknown').view).toBe('workshop');expect(readAppRoute('#/catalog/abc').blueprintId).toBeUndefined()})
})
