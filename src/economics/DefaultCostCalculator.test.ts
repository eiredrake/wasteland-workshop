import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'

describe('DefaultCostCalculator', () => {
  const calculator = new DefaultCostCalculator()

  it('values 10 Mind at 8 credits', () => {
    expect(calculator.calculateMindCost(10)).toBe(8)
  })

  it('values 20 minutes at 2 credits', () => {
    expect(calculator.calculateTimeCost(20)).toBe(2)
  })

  it('uses custom economics settings', () => {
    const customCalculator = new DefaultCostCalculator({
      mindCostPerPoint: 1,
      timeCostPerMinute: 0.25,
      defaultMarkupPercent: 30,
      basicForagingCardCost: 3,
      proficientForagingCardCost: 6,
      masterForagingCardCost: 10,
    })
  
    expect(customCalculator.calculateMindCost(10)).toBe(10)
    expect(customCalculator.calculateTimeCost(20)).toBe(5)
  })

  it('calculates Sagely Healing Brew production cost as 37 credits', () => {
    const productionCost = calculator.calculateProductionCost({
      mind: 10,
      minutes: 20,
      materialCost: 27,
      resolve: 0,
    })

    expect(productionCost).toBe(37)
  })

  it('calculates 25 percent markup on 37 credits as 47 credits', () => {
    expect(calculator.calculateSellingPrice(37, 25)).toBe(47)
  })
})