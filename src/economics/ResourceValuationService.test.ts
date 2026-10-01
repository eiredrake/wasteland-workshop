import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateResourceValuations } from './ResourceValuationService'

describe('calculateResourceValuations', () => {
  const calculator = new DefaultCostCalculator()

  it('calculates every acquisition method for a resource', () => {
    const valuations = calculateResourceValuations(
      {
        itemId: 1234,
        acquisitionMethods: [
          {
            name: 'Proficient Agriculture',
            mind: 10,
            minutes: 10,
            materialCost: 0,
            resolveCost: 0,
          },
          {
            name: 'Alternative Method',
            mind: 5,
            minutes: 30,
            materialCost: 0,
            resolveCost: 0,
          },
        ],
      },
      calculator
    )

    expect(valuations).toHaveLength(2)

    expect(valuations[0].acquisitionMethod.name).toBe(
      'Proficient Agriculture'
    )
    expect(valuations[0].calculatedCost).toBe(9)

    expect(valuations[1].acquisitionMethod.name).toBe(
      'Alternative Method'
    )
    expect(valuations[1].calculatedCost).toBe(7)
  })
})