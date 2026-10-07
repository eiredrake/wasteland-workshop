import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateResourceValuation } from './ResourceValuation'

describe('calculateResourceValuation', () => {
  const calculator = new DefaultCostCalculator()

  it('calculates a resource value from its acquisition method', () => {
    const valuation = calculateResourceValuation(
      1234,
      {
        name: 'Proficient Agriculture',
        mind: 10,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
      },
      calculator
    )

    expect(valuation.itemId).toBe(1234)
    expect(valuation.calculatedCost).toBe(5)
  })
})