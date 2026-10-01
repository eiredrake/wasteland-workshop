import type { ResourceEconomics } from './ResourceEconomics'

export const testResourceEconomics: ResourceEconomics[] = [
  {
    itemId: 3807,
    acquisitionMethods: [
      {
        name: 'Basic Agriculture',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
      },
    ],
  },
  {
    itemId: 3808,
    acquisitionMethods: [
      {
        name: 'Proficient Agriculture',
        mind: 10,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
      },
    ],
  },
  {
    itemId: 3809,
    acquisitionMethods: [
      {
        name: 'Master Agriculture',
        mind: 15,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
      },
    ],
  },
  {
    itemId: 3883,
    acquisitionMethods: [
      {
        name: 'Master Travel',
        mind: 10,
        minutes: 0,
        materialCost: 15,
        resolve: 0,
      },
    ],
  },  
  {
    itemId: 3896,
    acquisitionMethods: [
      {
        name: 'Master Travel',
        mind: 10,
        minutes: 0,
        materialCost: 15,
        resolve: 0,
      },
    ],
  }, 
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