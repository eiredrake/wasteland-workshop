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
  onCraftBlueprint: (
    blueprintName: string,
    craftingMinutes: number
  ) => void
}

function BlueprintSearch({
  calculator,
  defaultMarkupPercent,
  activeCollection,
  craftTimer,
  onUpdateCollectionEntry,
  onCraftBlueprint,
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
        ]

        return searchableFields.some(
          (field) =>
            field
              .toLowerCase()
              .includes(
                normalizedSearch
              )
        )
      }
    )

  return (
    <section>
      <div className="blueprint-search">
        <span
          className="blueprint-search-icon"
          aria-hidden="true"
        />

        <input
          type="search"
          placeholder="Search blueprints..."
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value
            )
          }
        />
      </div>

      <Datalist<Blueprint>
        title={`Blueprints (${filteredBlueprints.length})`}
        items={filteredBlueprints}
        columns={
          getBlueprintColumns()
        }
        getRowKey={(blueprint) =>
          blueprint.id
        }
        showAddButton={false}
        emptyMessage="No blueprints found."
        backLabel="Back to Blueprints"
        renderDetails={(blueprint) => (
          <BlueprintDetails
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