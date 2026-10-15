import {expect,it} from 'vitest'
import {alphabeticalOptions} from './OptionOrder'
it('sorts labels case-insensitively with punctuation ignored and numbers ascending',()=>{
 const options=['zebra','Restore 20 Mind','apple','Restore 5 Mind','"Members Only"','Beta']
 expect(alphabeticalOptions(options,item=>item)).toEqual(['apple','Beta','"Members Only"','Restore 5 Mind','Restore 20 Mind','zebra'])
 expect(options[0]).toBe('zebra')
})
it('keeps IDs, duplicate labels and readonly source arrays intact',()=>{
 const options=Object.freeze([{id:3,name:'Zinc'},{id:2,name:'alloy'},{id:1,name:'Alloy'}])
 expect(alphabeticalOptions(options,item=>item.name).map(item=>item.id)).toEqual([2,1,3])
 expect(options.map(item=>item.id)).toEqual([3,2,1])
})
