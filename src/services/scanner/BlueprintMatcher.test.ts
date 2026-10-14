import {expect,it} from 'vitest'
import {BlueprintMatcher} from './BlueprintMatcher'
it('returns a canonical ID/name for one exact normalized match',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'}]).match('  aa BLADE  ')).toEqual({ok:true,value:{id:1,name:'AA Blade'}}))
it.each(['','  ','Blade','AA Blad','XAA Blade','AA Blades'])('does not match incomplete names or partial words: %s',async text=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'}]).match(text)).toMatchObject({ok:false,error:{code:'NO_MATCH'}}))
it('does not resolve duplicate normalized names by taking the first record',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'Hooch'},{id:2,name:'hooch'}]).match('Hooch')).toMatchObject({ok:false,error:{code:'AMBIGUOUS_MATCH'}}))
it('catalog failures remain distinct from no match',async()=>expect(await new BlueprintMatcher(async()=>{throw new Error('Catalog offline')}).match('Hooch')).toMatchObject({ok:false,error:{code:'CATALOG_UNAVAILABLE',message:'Catalog offline',stage:'matching'}}))
it('uses the existing master catalog by default',async()=>expect(await new BlueprintMatcher().match('Hooch')).toMatchObject({ok:true,value:{id:4407,name:'Hooch'}}))

it('matches individual lines and deduplicates repeated IDs',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'}]).match('instructions\n AA BLADE \r\nAA Blade\nmore text')).toEqual({ok:true,value:{id:1,name:'AA Blade'}}))
it('reports ambiguity for distinct names on different lines',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'},{id:2,name:'Hooch'}]).match('AA Blade\nHooch')).toMatchObject({ok:false,error:{code:'AMBIGUOUS_MATCH'}}))

it('identifies the reported printed Hooch field from real OCR output',async()=>expect(await new BlueprintMatcher().match('Item Name Hooch :\nItem Type Intoxication Brew\n')).toEqual({ok:true,value:{id:4407,name:'Hooch'}}))
it.each(['Item Name: Hooch','ITEM NAME : Hooch :','Item Name\tHooch'])('extracts an exact name from a labeled field: %s',async text=>expect(await new BlueprintMatcher().match(text)).toMatchObject({ok:true,value:{name:'Hooch'}}))
it.each(['Item Name Hooches','Item Name XHooch','Item Type Hooc','Not Item Name Ho0ch'])('does not guess altered names: %s',async text=>expect(await new BlueprintMatcher().match(text)).toMatchObject({ok:false,error:{code:'NO_MATCH'}}))
it('retains ambiguity across labeled name fields',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'AA Blade'},{id:2,name:'Hooch'}]).match('Item Name AA Blade\nItem Name Hooch :')).toMatchObject({ok:false,error:{code:'AMBIGUOUS_MATCH'}}))

it.each(['Item Type Hooch and other text','words before Hooch words after','Hooch!','AA  Blade'])('finds complete names surrounded by unrelated text: %s',async text=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'Hooch'},{id:2,name:'AA Blade'}]).match(text)).toMatchObject({ok:true}))
it('prefers the full longer name over a contained catalog name',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'Blade'},{id:2,name:'AA Blade'}]).match('Item Name AA Blade :')).toEqual({ok:true,value:{id:2,name:'AA Blade'}}))
it('keeps distinct occurrences ambiguous even when names overlap elsewhere',async()=>expect(await new BlueprintMatcher(async()=>[{id:1,name:'Blade'},{id:2,name:'AA Blade'}]).match('AA Blade and Blade')).toMatchObject({ok:false,error:{code:'AMBIGUOUS_MATCH'}}))

it('matches both reported Freeiron crops including the printed label',async()=>{const matcher=new BlueprintMatcher();for(const text of ['Bem Eee\nFreeiron Dry Pack\n','Item Name Freeiron Dry Pack\n'])expect(await matcher.match(text)).toEqual({ok:true,value:{id:5234,name:'Freeiron Dry Pack'}})})
