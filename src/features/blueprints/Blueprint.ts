import type { ItemCrafting } from './ItemCrafting'
import type { ItemMetadata } from './ItemMetadata'

export type Blueprint = {
  procedureConfiguration?: import('../actions/Action').ActionConfiguration
  id: number
  name: string
  kind: string
  updatedAt?: string
  metadata?: ItemMetadata
  itemCraftings?: ItemCrafting[]
}