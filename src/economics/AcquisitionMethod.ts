import type { ProductionCostInput } from './CostCalculator'

export type AcquisitionResource = {
  itemId: number
  quantity: number
}

export type AcquisitionMethod = ProductionCostInput & {
  name: string
  resources?: AcquisitionResource[]
}