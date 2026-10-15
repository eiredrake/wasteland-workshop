import {describe,it,expect} from 'vitest'
import {isWorkshopApp} from './InstalledApp'
describe('installed Workshop identity',()=>{
 const origin='https://workshop-test.foundationsrpg.org'
 it('recognizes its own relative and absolute IDs or Android manifest URL',()=>{
  expect(isWorkshopApp({platform:'webapp',id:'/'},origin)).toBe(true)
  expect(isWorkshopApp({platform:'webapp',id:origin+'/'},origin)).toBe(true)
  expect(isWorkshopApp({platform:'webapp',url:'/manifest.webmanifest'},origin)).toBe(true)
 })
 it('does not confuse production, another app, or an unknown platform with this installation',()=>{
  for(const app of [{platform:'webapp',id:'https://workshop.foundationsrpg.org/'},{platform:'webapp',id:'/other'},{platform:'play',id:'/'},{platform:'webapp',url:'/other.webmanifest'},{}])expect(isWorkshopApp(app,origin)).toBe(false)
 })
})
