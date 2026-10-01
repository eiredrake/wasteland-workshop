import type { ItemCrafting } from './ItemCrafting'
import type { ItemMetadata } from './ItemMetadata'

export type Blueprint = {
  id: number
  name: string
  // skill: string
  grade: string
  // mind: number
  // minutes: number
  kind: string
  //components: BlueprintComponent[]
  metadata?: ItemMetadata
  itemCraftings?: ItemCrafting[]
}