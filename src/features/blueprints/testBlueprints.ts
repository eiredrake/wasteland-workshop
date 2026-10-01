import type { Blueprint } from './Blueprint'

export const testBlueprints: Blueprint[] = [
  {
    id: 4597,
    name: '.38 Caliber Privacy Pipes',
    kind: 'Vehicle Augment',
    skill: 'Artisan',
    grade: 'Master',
    mind: 15,
    minutes: 20,

    components: [
      {
        id: 3868,
        name: 'Rare Scrap',
        kind: '',
        quantity: 3,
      },
      {
        id: 3883,
        name: 'Mechanical Components',
        kind: '',
        quantity: 1,
      },
      {
        id: 3896,
        name: 'Weapons Platform',
        kind: '',
        quantity: 1,
      },
    ],
  },

  {
    id: 4444,
    name: 'Sagely Healing Brew',
    kind: 'Healing Brew',
    skill: 'Culinary',
    grade: 'Proficient',
    mind: 10,
    minutes: 20,

    components: [
      {
        id: 3808,
        name: 'Uncommon Herb',
        kind: '',
        quantity: 3,
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
    skill: 'Basic Artisan',
    mind: 5,
    minutes: 20,
    components: [],

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
]