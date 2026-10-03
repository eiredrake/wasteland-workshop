import type { ItemMetadata } from './ItemMetadata'

export type CraftingFinalProduct = {
  id: number
  stack: number
  finalProduct: {
    id: number
    name: string
    grade: string
    kind: string
    lifetimeAmount: number | null
    lifetimeUnit: string
    metadata?: ItemMetadata
  }
}