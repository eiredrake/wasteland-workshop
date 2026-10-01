import type { CraftingComponent } from './CraftingComponent'
import type { CraftingFinalProduct } from './CraftingFinalProduct'

export type ItemCrafting = {
  id: number
  craftingTimeInMinute: number
  craftingMindCost: number
  craftingResolveCost: number
  craftingZone: string
  craftingSkills: string
  craftingComponents: CraftingComponent[]
  craftingFinalProducts: CraftingFinalProduct[]
}