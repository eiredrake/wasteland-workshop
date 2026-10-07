import type { IngredientItem } from './IngredientRequirement'
export type CraftingComponent = {
  id: number
  acceptsExpiredItemWithinDays: number
  component: IngredientItem
  amount: number
}