import SearchInput from '../../components/SearchInput/SearchInput'
import BlueprintName from '../../components/BlueprintName/BlueprintName'
import { matchesBlueprintSearch } from './BlueprintSearchMatch'
import type { Warehouse } from '../warehouse/Warehouse'
import { useState } from 'react'
import Datalist from '../../components/Datalist/Datalist'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import { masterBlueprints } from './blueprints'
import BlueprintDetails from './BlueprintDetails'
import type { BlueprintShoppingProps } from '../shopping/BlueprintShoppingAction'
import './BlueprintSearch.css'
import type { CraftTimerState } from '../timer/CraftTimerState'

function getBlueprintKind(
  blueprint: Blueprint
) {
  const kind =
    blueprint.itemCraftings?.[0]
      ?.craftingFinalProducts?.[0]
      ?.finalProduct.kind

  if (!kind) {
    return 'Unknown'
  }

  return kind
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ')
}

function getBlueprintCraftingSkill(
  blueprint: Blueprint
) {
  return (
    blueprint.itemCraftings?.[0]
      ?.craftingSkills ?? 'Unknown'
  )
}

function getBlueprintUpdatedDate(
  blueprint: Blueprint
) {
  if (!blueprint.updatedAt) {
    return 'Unknown'
  }

  return new Date(
    blueprint.updatedAt
  ).toLocaleDateString()
}

function getBlueprintStatus(
  blueprint: Blueprint,
  activeCollection:
    BlueprintCollection | undefined
): BlueprintAccessStatus | undefined {
  return activeCollection?.entries.find(
    (entry) =>
      entry.blueprintId === blueprint.id
  )?.status
}

function getNextStatus(
  currentStatus:
    | BlueprintAccessStatus
    | undefined
): BlueprintAccessStatus | undefined {
  if (currentStatus === undefined) {
    return 'to-acquire'
  }

  if (currentStatus === 'to-acquire') {
    return 'acquired'
  }

  if (currentStatus === 'acquired') {
    return undefined
  }

  /*
   * To Sell cannot be entered from the
   * Master Catalog. If an existing collection
   * entry is already To Sell, return it to
   * Acquired when clicked here.
   */
  return 'acquired'
}

type BlueprintSearchProps = {
  initialBlueprint?: Blueprint
  onBlueprintSelected?: (blueprint:Blueprint)=>void
  warehouse?: Warehouse
  warehouseError?: string
  shopping: BlueprintShoppingProps
  calculator: CostCalculator
  defaultMarkupPercent: number
  craftTimer: CraftTimerState
  onOpenCraftTimer: () => void
  activeCollection:
    BlueprintCollection | undefined
  onUpdateCollectionEntry: (
    blueprintId: number,
    blueprintName: string,
    status:
      | BlueprintAccessStatus
      | undefined
  ) => void
  onCraftBlueprint: (blueprint: Blueprint) => void
  onAddBuild: (blueprint: Blueprint) => void
}

function BlueprintSearch({
  initialBlueprint,
  onBlueprintSelected,
  warehouse,
  warehouseError,
  shopping,
  calculator,
  defaultMarkupPercent,
  activeCollection,
  craftTimer,
  onUpdateCollectionEntry,
  onCraftBlueprint,
  onAddBuild,
  onOpenCraftTimer,
}: BlueprintSearchProps) {
  const [searchText, setSearchText] =
    useState('')

  const normalizedSearch =
    searchText
      .trim()
      .toLowerCase()

  const handleStatusClick = (
    event: React.MouseEvent,
    blueprint: Blueprint
  ) => {
    event.stopPropagation()

    if (!activeCollection) {
      return
    }

    const currentStatus =
      getBlueprintStatus(
        blueprint,
        activeCollection
      )

    const nextStatus =
      getNextStatus(currentStatus)

    onUpdateCollectionEntry(
      blueprint.id,
      blueprint.name,
      nextStatus
    )
  }

  const getBlueprintColumns = () => [
    {
      key: 'id' as keyof Blueprint,
      label: 'Status',
      protected: true,
      minWidth: 120,
      render: (
        blueprint: Blueprint,
        compact: boolean) => {
        if (!activeCollection) {
          return (
            <span className="workshop-status workshop-status-none">
              No Active Collection
            </span>
          )
        }

        const status =
          getBlueprintStatus(
            blueprint,
            activeCollection
          )

        let label = 'Not Acquired'
        let className =
          'workshop-status workshop-status-none'

        if (status === 'acquired') {
          label = 'Acquired'
          className =
            'workshop-status workshop-status-acquired'
        }

        if (status === 'to-acquire') {
          label = 'To Acquire'
          className =
            'workshop-status workshop-status-to-acquire'
        }

        if (status === 'sell') {
          label = 'To Sell'
          className =
            'workshop-status workshop-status-sell'
        }

        let compactLabel = '—'

        if (status === 'acquired') {
          compactLabel = '✓'
        }
        
        if (status === 'to-acquire') {
          compactLabel = '★'
        }
        
        if (status === 'sell') {
          compactLabel = '$'
        }        

        return (
          <button
            type="button"
            className={className}
            onClick={(event) =>
              handleStatusClick(
                event,
                blueprint
              )
            }
            title={`Change status in ${activeCollection.name}`}
          >
            {compact ? compactLabel : label}
          </button>
        )
      },
    },
    {
      key: 'name' as keyof Blueprint,
      label: 'Blueprint',
      protected: true,
      minWidth: 170,
      render: (blueprint: Blueprint) => <BlueprintName blueprint={blueprint} />,
    },
    {
      key:
        'itemCraftings' as keyof Blueprint,
      label: 'Crafting Skill',
      priority: 1,
      minWidth: 210,
      sortValue: (
        blueprint: Blueprint
      ) =>
        getBlueprintCraftingSkill(
          blueprint
        ),
      render: (
        blueprint: Blueprint
      ) => (
        <span className="blueprint-crafting-skill">
          {getBlueprintCraftingSkill(
            blueprint
          )}
        </span>
      ),
    },
    {
      key: 'kind' as keyof Blueprint,
      label: 'Kind',
      priority: 2,
      minWidth: 160,
      sortValue: (
        blueprint: Blueprint
      ) =>
        getBlueprintKind(blueprint),
      render: (
        blueprint: Blueprint
      ) => (
        <span className="blueprint-kind">
          {getBlueprintKind(
            blueprint
          )}
        </span>
      ),
    },
    {
      key: 'updatedAt' as keyof Blueprint,
      label: 'Last Updated',
      priority: 3,
      minWidth: 140,
      sortValue: (
        blueprint: Blueprint
      ) =>
        blueprint.updatedAt ?? '',
      render: (
        blueprint: Blueprint
      ) => (
        <span className="blueprint-updated">
          {getBlueprintUpdatedDate(
            blueprint
          )}
        </span>
      ),
    },    
  ]

  const filteredBlueprints =
    masterBlueprints.filter(
      (blueprint) => {
        const searchableFields = [
          blueprint.name,
          getBlueprintCraftingSkill(
            blueprint
          ),
          getBlueprintKind(blueprint),
          getBlueprintUpdatedDate(
            blueprint
          ),
        ]

        return matchesBlueprintSearch(blueprint, normalizedSearch, searchableFields)
      }
    )

  return (
    <section data-tour-target="blueprint-catalog">
      <div data-tour-target="blueprint-search"><SearchInput label="Search blueprints" value={searchText} onValueChange={setSearchText} placeholder="Search blueprints..."/></div>

      <Datalist<Blueprint>
        initialDetailsItem={initialBlueprint}
        onRowClick={onBlueprintSelected}
        title={`Blueprints (${filteredBlueprints.length})`}
        items={filteredBlueprints}
        columns={
          getBlueprintColumns()
        }
        getRowKey={(blueprint) =>
          blueprint.id
        }
        showAddButton={false}
        detailsResetKey={searchText}
        emptyMessage="No blueprints found."
        backLabel="Back to Blueprints"
        renderDetails={(blueprint) => (
          <BlueprintDetails warehouse={warehouse} warehouseError={warehouseError}
            shopping={shopping}
            blueprint={blueprint}
            mode="catalog"
            calculator={calculator}
            defaultMarkupPercent={
              defaultMarkupPercent
            }
            activeCollection={
              activeCollection
            }
            craftTimer={craftTimer}
            onUpdateCollectionEntry={
              onUpdateCollectionEntry
            }
            onAddBuild={onAddBuild}
            onCraftBlueprint={
              onCraftBlueprint
            }
            onOpenCraftTimer={
              onOpenCraftTimer
            }
          />
        )}
      />
    </section>
  )
}

export default BlueprintSearch