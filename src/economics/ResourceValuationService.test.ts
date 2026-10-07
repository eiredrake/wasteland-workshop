import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateResourceAcquisitionCosts } from './ResourceValuationService'

describe('calculateResourceAcquisitionCosts', () => {
  const calculator = new DefaultCostCalculator()

  it('rounds a fractional resource valuation up to a whole credit', () => {
    const valuations = calculateResourceAcquisitionCosts(
      {
        itemId: 3878,
        acquisitionMethods: [
          {
            name: 'Basic Foraging',
            mind: 1,
            minutes: 0,
            materialCost: 0,
            resolve: 0,
          },
        ],
      },
      calculator
    )
  
    expect(valuations[0].calculatedCost).toBe(1)
  })

  it('includes proficient foraging card cost in resource valuation', () => {
    const valuations = calculateResourceAcquisitionCosts(
      {
        itemId: 3880,
        acquisitionMethods: [
          {
            name: 'Proficient Foraging',
            mind: 5,
            minutes: 0,
            materialCost: 0,
            resolve: 0,
            foragingTier: 'proficient',
          },
        ],
      },
      calculator
    )
  
    expect(valuations[0].calculatedCost).toBe(6)
  })  

  it('includes master foraging card cost in resource valuation', () => {
    const valuations = calculateResourceAcquisitionCosts(
      {
        itemId: 3881,
        acquisitionMethods: [
          {
            name: 'Master Foraging',
            mind: 10,
            minutes: 0,
            materialCost: 0,
            resolve: 0,
            foragingTier: 'master',
          },
        ],
      },
      calculator
    )
  
    expect(valuations[0].calculatedCost).toBe(8)
  })

  it('calculates every acquisition method for a resource', () => {
    const valuations = calculateResourceAcquisitionCosts(
      {
        itemId: 1234,
        acquisitionMethods: [
          {
            name: 'Proficient Agriculture',
            mind: 10,
            minutes: 10,
            materialCost: 0,
            resolve: 0,
          },
          {
            name: 'Alternative Method',
            mind: 5,
            minutes: 30,
            materialCost: 0,
            resolve: 0,
          },
        ],
      },
      calculator
    )

    

    expect(valuations).toHaveLength(2)

    expect(valuations[0].acquisitionMethod.name).toBe(
      'Proficient Agriculture'
    )
    expect(valuations[0].calculatedCost).toBe(5)

    expect(valuations[1].acquisitionMethod.name).toBe(
      'Alternative Method'
    )
    expect(valuations[1].calculatedCost).toBe(5)
  })

  it('returns an unknown cost when a required resource has no valuation', () => {
    const resources = [
      {
        itemId: 3868,
        acquisitionMethods: [
          {
            name: 'Artisan Crafting - Rare Scrap',
            mind: 5,
            minutes: 10,
            materialCost: 0,
            resolve: 0,
            resources: [
              {
                itemId: 3867,
                quantity: 3,
              },
            ],
          },
        ],
      },
    ]
  
    const valuations = calculateResourceAcquisitionCosts(
      resources[0],
      calculator,
      resources
    )
  
    expect(valuations).toHaveLength(1)
    expect(valuations[0].calculatedCost).toBeUndefined()
  })  

  it('calculates cost through a required resource', () => {
    const resources = [
      {
        itemId: 3866,
        acquisitionMethods: [
          {
            name: 'Test Basic Scrap',
            mind: 0,
            minutes: 0,
            materialCost: 2,
            resolve: 0,
          },
        ],
      },
      {
        itemId: 3867,
        acquisitionMethods: [
          {
            name: 'Artisan Crafting - Uncommon Scrap',
            mind: 5,
            minutes: 10,
            materialCost: 0,
            resolve: 0,
            resources: [
              {
                itemId: 3866,
                quantity: 3,
              },
            ],
          },
        ],
      },
    ]
  
    const valuations = calculateResourceAcquisitionCosts(
      resources[1],
      calculator,
      resources
    )
  
    expect(valuations).toHaveLength(1)
    expect(valuations[0].calculatedCost).toBe(9)
  })  
})
