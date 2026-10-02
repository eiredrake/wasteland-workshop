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
    itemId: 3886,
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

  // Basic Foraging
  {
    itemId: 3866,
    acquisitionMethods: [
      {
        name: 'Basic Foraging',
        mind: 1,
        minutes: 0,
        materialCost: 0,
        resolve: 0,
        foragingCardCost: 2,
      },
    ],
  },
  {
    itemId: 3878,
    acquisitionMethods: [
      {
        name: 'Basic Foraging',
        mind: 1,
        minutes: 0,
        materialCost: 0,
        resolve: 0,
        foragingCardCost: 2,
      },
    ],
  },

  // Scrap
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

  // Metals
  {
    itemId: 3869,
    acquisitionMethods: [
      {
        name: 'Artisan Crafting - Alloy Metal',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
        resources: [
          {
            itemId: 3866,
            quantity: 6,
          },
        ],
      },
    ],
  },
  {
    itemId: 3870,
    acquisitionMethods: [
      {
        name: 'Artisan Crafting - Conductive Metal',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
        resources: [
          {
            itemId: 3866,
            quantity: 6,
          },
        ],
      },
    ],
  },
  {
    itemId: 3871,
    acquisitionMethods: [
      {
        name: 'Artisan Crafting - Radioactive Metal',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
        resources: [
          {
            itemId: 3866,
            quantity: 6,
          },
        ],
      },
    ],
  },
  {
    itemId: 3872,
    acquisitionMethods: [
      {
        name: 'Artisan Crafting - Hard Metal',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
        resources: [
          {
            itemId: 3866,
            quantity: 6,
          },
        ],
      },
    ],
  },
  {
    itemId: 3873,
    acquisitionMethods: [
      {
        name: 'Artisan Crafting - Soft Metal',
        mind: 5,
        minutes: 10,
        materialCost: 0,
        resolve: 0,
        resources: [
          {
            itemId: 3866,
            quantity: 6,
          },
        ],
      },
    ],
  },
]