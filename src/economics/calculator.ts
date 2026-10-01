import type { CostCalculator } from './CostCalculator'
import { DefaultCostCalculator } from './DefaultCostCalculator'

export const costCalculator: CostCalculator = new DefaultCostCalculator()