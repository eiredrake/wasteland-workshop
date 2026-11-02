import type { BlueprintAccessStatus, BlueprintCollection } from './BlueprintCollection'
// Shared membership mutation for manual blueprint status badges.
export function setCollectionBlueprintStatus(collection:BlueprintCollection,blueprintId:number,status:BlueprintAccessStatus|undefined):BlueprintCollection {
 const entry=collection.entries.find(e=>e.blueprintId===blueprintId)
 if(entry?.status===status)return collection
 if(status===undefined)return {...collection,entries:collection.entries.filter(e=>e.blueprintId!==blueprintId)}
 return {...collection,entries:entry?collection.entries.map(e=>e.blueprintId===blueprintId?{...e,status}:e):[...collection.entries,{blueprintId,status}]}
}

// Not Acquired is represented by an absent collection entry (undefined).
// All cycling controls use this sequence; explicit Acquire actions set acquired directly.
export function nextBlueprintCollectionStatus(status: BlueprintAccessStatus | undefined): BlueprintAccessStatus | undefined {
 switch(status) {
  case undefined: return 'acquired'
  case 'acquired': return 'to-acquire'
  case 'to-acquire': return 'sell'
  case 'sell': return undefined
 }
}

export function blueprintCollectionStatusLabel(status: BlueprintAccessStatus | undefined): string {
 switch(status) {
  case undefined: return 'Not Acquired'
  case 'acquired': return 'Acquired'
  case 'to-acquire': return 'To Acquire'
  case 'sell': return 'To Sell'
 }
}
