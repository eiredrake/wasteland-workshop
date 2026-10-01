export type CraftingComponent = {
  id: number
  acceptsExpiredItemWithinDays: number
  component: {
    id: number
    name: string
    grade: string
    kind: string
  }
  amount: number
}