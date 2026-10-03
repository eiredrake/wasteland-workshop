import type { CraftingComponent } from './CraftingComponent'
import type { CraftingFinalProduct } from './CraftingFinalProduct'

export type ItemCrafting = {
  id: number
  craftingTimeInMinute: number
  craftingMindCost: number
  craftingResolveCost: number | null
  craftingZone: string | null
  craftingSkills: string | null
  craftingComponents: CraftingComponent[]
  craftingFinalProducts: CraftingFinalProduct[]
}