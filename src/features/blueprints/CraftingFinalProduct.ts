import type { ItemMetadata } from './ItemMetadata'

// Existing catalog associations used for applied/consumed and other output variants.
export type CraftedProductVariant = {
  id: number
  name: string
  kind: string
  metadata?: ItemMetadata
  childItemClassifications?: { id?: number; childItem: CraftedProductVariant }[]
}

export type CraftingFinalProduct = {
  id: number
  stack: number
  finalProduct: CraftedProductVariant & {
    grade: string
    lifetimeAmount: number | null
    lifetimeUnit: string
  }
}