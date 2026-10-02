import type { Blueprint } from './Blueprint'

export const testBlueprints: Blueprint[] = [
  {
    id: 4597,
    name: '.38 Caliber Privacy Pipes',
    kind: 'blueprint',
    grade: 'ungraded',

    metadata: {
      mechanics: null,
      notes:
        'A Skilled Artisan Assistant helping with the creation of this item regains 2 Mind. When crafted, must have an unexpired Angry Anchor Work Ship to attach the augment to.',
      printHeader: 'Artisan Recipe',
      requirementsToUse: null,
      uses: null,
      durationOfEffect: null,
      validTargetDescription: null,
      locationOfUse: null,
      equipmentRequiredForUse: null,
      durationOfRoleplay: null,
      descriptionOfRoleplay: null,
      activationRequirement: null,
      vehicleArmor: null,
      vehicleHull: null,
      vehicleSpeed: null,
      vehicleTurnRadius: null,
      vehicleCrewCapacity: null,
    },

    itemCraftings: [
      {
        id: 1551,
        craftingTimeInMinute: 20,
        craftingMindCost: 15,
        craftingResolveCost: 0,
        craftingZone: 'Artisan Space',
        craftingSkills: 'Master Artisan',

        craftingComponents: [
          {
            id: 3899,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3868,
              name: 'Rare Scrap',
              grade: 'ungraded',
              kind: 'unnamed_scrap',
            },
            amount: 3,
          },
          {
            id: 3900,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3883,
              name: 'Mechanical Components',
              grade: 'ungraded',
              kind: 'trade_resource',
            },
            amount: 1,
          },
          {
            id: 3901,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3896,
              name: 'Weapons Platform',
              grade: 'ungraded',
              kind: 'crafting_resource',
            },
            amount: 1,
          },
        ],

        craftingFinalProducts: [
          {
            id: 1510,
            stack: 1,
            finalProduct: {
              id: 4167,
              name: '.38 Caliber Privacy Pipes',
              grade: 'ungraded',
              kind: 'vehicle_augment',
              lifetimeAmount: 24,
              lifetimeUnit: 'month',
            },
          },
        ],
      },
    ],
  },

  {
    id: 4444,
    name: 'Sagely Healing Injection',
    kind: 'blueprint',
    grade: 'ungraded',

    metadata: {
      mechanics: null,
      notes:
        'A Skilled Culinary Assistant helping with the creation of this item regains 2 Mind.',
      printHeader: 'Culinary Recipe',
      requirementsToUse: null,
      uses: null,
      durationOfEffect: null,
      validTargetDescription: null,
      locationOfUse: null,
      equipmentRequiredForUse: null,
      durationOfRoleplay: null,
      descriptionOfRoleplay: null,
      activationRequirement: null,
      vehicleArmor: null,
      vehicleHull: null,
      vehicleSpeed: null,
      vehicleTurnRadius: null,
      vehicleCrewCapacity: null,
    },

    itemCraftings: [
      {
        id: 1398,
        craftingTimeInMinute: 20,
        craftingMindCost: 10,
        craftingResolveCost: 0,
        craftingZone: 'Culinary Space',
        craftingSkills: 'Proficient Culinary',

        craftingComponents: [
          {
            id: 3531,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3808,
              name: 'Uncommon Herb',
              grade: 'ungraded',
              kind: 'unnamed_herb',
            },
            amount: 3,
          },
        ],

        craftingFinalProducts: [
          {
            id: 1378,
            stack: 1,
            finalProduct: {
              id: 4015,
              name: 'Sagely Healing Injection',
              grade: 'ungraded',
              kind: 'injected_brew',
              lifetimeAmount: 12,
              lifetimeUnit: 'month',
            },
          },
        ],
      },
    ],
  },

  {
    id: 5890,
    name: 'Falsified Papers',
    kind: 'blueprint',
    grade: 'ungraded',

    // Temporary compatibility fields.
    // BlueprintDetails still uses the old flattened model.

    metadata: {
      mechanics: null,
      notes:
        'A Skilled Artisan Assistant helping with the creation of this item regains 2 Mind.',
      printHeader: 'Dubious Directions',
      requirementsToUse: null,
      uses: null,
      durationOfEffect: null,
      validTargetDescription: null,
      locationOfUse: null,
      equipmentRequiredForUse: null,
      durationOfRoleplay: null,
      descriptionOfRoleplay: null,
      activationRequirement: null,
      vehicleArmor: null,
      vehicleHull: null,
      vehicleSpeed: null,
      vehicleTurnRadius: null,
      vehicleCrewCapacity: null,
    },

    itemCraftings: [
      {
        id: 2215,
        craftingTimeInMinute: 20,
        craftingMindCost: 5,
        craftingResolveCost: 0,
        craftingZone: 'Artisan Space',
        craftingSkills:
          'Basic Artisan & Society Membership: Adherents of Betrayal',

        craftingComponents: [
          {
            id: 5095,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3807,
              name: 'Basic Herb',
              grade: 'ungraded',
              kind: 'unnamed_herb',
            },
            amount: 2,
          },
          {
            id: 5096,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3808,
              name: 'Uncommon Herb',
              grade: 'ungraded',
              kind: 'unnamed_herb',
            },
            amount: 2,
          },
        ],

        craftingFinalProducts: [
          {
            id: 2189,
            stack: 1,
            finalProduct: {
              id: 5889,
              name: 'Falsified Papers',
              grade: 'ungraded',
              kind: 'gizmo',
              lifetimeAmount: 0,
              lifetimeUnit: 'month',
            },
          },
        ],
      },
    ],
  },

  {
    id: 4578,
    name: 'Sosweet Smashstick',
    kind: 'blueprint',
    grade: 'ungraded',

    metadata: {
      mechanics: null,
      notes:
        'A Skilled Artisan Assistant helping with the creation of this item regains 2 Mind.',
      printHeader: 'Artisan Recipe',
      requirementsToUse: null,
      uses: null,
      durationOfEffect: null,
      validTargetDescription: null,
      locationOfUse: null,
      equipmentRequiredForUse: null,
      durationOfRoleplay: null,
      descriptionOfRoleplay: null,
      activationRequirement: null,
      vehicleArmor: null,
      vehicleHull: null,
      vehicleSpeed: null,
      vehicleTurnRadius: null,
      vehicleCrewCapacity: null,
    },

    itemCraftings: [
      {
        id: 1532,
        craftingTimeInMinute: 20,
        craftingMindCost: 15,
        craftingResolveCost: 0,
        craftingZone: 'Artisan Space',
        craftingSkills: 'Master Artisan',

        craftingComponents: [
          {
            id: 3871,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3868,
              name: 'Rare Scrap',
              grade: 'ungraded',
              kind: 'unnamed_scrap',
            },
            amount: 4,
          },
          {
            id: 3873,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3873,
              name: 'Soft Metal',
              grade: 'ungraded',
              kind: 'metal',
            },
            amount: 1,
          },
          {
            id: 3874,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3886,
              name: 'Synthetic Fibers',
              grade: 'ungraded',
              kind: 'trade_resource',
            },
            amount: 1,
          },
          {
            id: 3872,
            acceptsExpiredItemWithinDays: 0,
            component: {
              id: 3878,
              name: 'Craftable Stone',
              grade: 'ungraded',
              kind: 'natural_resource',
            },
            amount: 2,
          },
        ],

        craftingFinalProducts: [
          {
            id: 1499,
            stack: 1,
            finalProduct: {
              id: 4148,
              name: 'SoSweet Smashstick',
              grade: 'ungraded',
              kind: 'melee_two_handed',
              lifetimeAmount: 24,
              lifetimeUnit: 'month',
            },
          },
        ],
      },
    ],
  },
]