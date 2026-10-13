import {expect,it} from 'vitest'
import {BlueprintMatcher} from './BlueprintMatcher'
it('returns a canonical ID/name for one exact normalized match',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'}]).match('  aa BLADE  ')).toEqual({ok:true,value:{id:1,name:'AA Blade'}}))
it.each(['','  ','Blade','AA  Blade','AA Blad','AA Blade!'])('does not use substring, fuzzy, spelling or punctuation guessing: %s',async text=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'}]).match(text)).toMatchObject({ok:false,error:{code:'NO_MATCH'}}))
it('does not resolve duplicate normalized names by taking the first record',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'Hooch'},{id:2,name:'hooch'}]).match('Hooch')).toMatchObject({ok:false,error:{code:'AMBIGUOUS_MATCH'}}))
it('catalog failures remain distinct from no match',async()=>expect(await new BlueprintMatcher(async()=>{throw new Error('Catalog offline')}).match('Hooch')).toMatchObject({ok:false,error:{code:'CATALOG_UNAVAILABLE',message:'Catalog offline',stage:'matching'}}))
it('uses the existing master catalog by default',async()=>expect(await new BlueprintMatcher().match('Hooch')).toMatchObject({ok:true,value:{id:4407,name:'Hooch'}}))
