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

function getBlueprintKind(blueprint: Blueprint) {
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

function getBlueprintStatus(
  blueprint: Blueprint,
  activeCollection: BlueprintCollection | undefined
): BlueprintAccessStatus | undefined {
  return activeCollection?.entries.find(
    (entry) => entry.blueprintId === blueprint.id
  )?.status
}

function getNextStatus(
  currentStatus: BlueprintAccessStatus | undefined
): BlueprintAccessStatus | undefined {
  if (currentStatus === undefined) {
    return 'acquired'
  }

  if (currentStatus === 'acquired') {
    return 'to-acquire'
  }

  return undefined
}

type BlueprintSearchProps = {
  calculator: CostCalculator
  defaultMarkupPercent: number
  craftTimer: CraftTimerState
  onOpenCraftTimer: () => void
  activeCollection: BlueprintCollection | undefined
  onUpdateCollectionEntry: (
    blueprintId: number,
    blueprintName: string,
    status: BlueprintAccessStatus | undefined
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
  const [searchText, setSearchText] = useState('')
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<Blueprint | null>(null)

  const normalizedSearch =
    searchText.trim().toLowerCase()

  const handleBlueprintClick = (
    blueprint: Blueprint
  ) => {
    setSelectedBlueprint(blueprint)
  }

  const handleStatusClick = (
    event: React.MouseEvent,
    blueprint: Blueprint
  ) => {
    event.stopPropagation()

    if (!activeCollection) {
      return
    }

    const currentStatus = getBlueprintStatus(
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
      key: 'name' as keyof Blueprint,
      label: 'Blueprint',
    },
    {
      key: 'kind' as keyof Blueprint,
      label: 'Kind',
      render: (blueprint: Blueprint) =>
        getBlueprintKind(blueprint),
    },
    {
      key: 'id' as keyof Blueprint,
      label: 'Status',
      render: (blueprint: Blueprint) => {
        if (!activeCollection) {
          return (
            <span className="workshop-status workshop-status-none">
              No Active Collection
            </span>
          )
        }

        const status = getBlueprintStatus(
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
            {label}
          </button>
        )
      },
    },
  ]

  const filteredBlueprints = masterBlueprints.filter(
    (blueprint) => {
      const searchableFields = [
        blueprint.name,
        getBlueprintKind(blueprint),
        blueprint.itemCraftings?.[0]
          ?.craftingSkills ?? '',
      ]

      return searchableFields.some((field) =>
        field
          .toLowerCase()
          .includes(normalizedSearch)
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
            setSearchText(event.target.value)
          }
        />
      </div>

      <Datalist<Blueprint>
        title={`Blueprints (${filteredBlueprints.length})`}
        items={filteredBlueprints}
        columns={getBlueprintColumns()}
        getRowKey={(blueprint) => blueprint.id}
        showAddButton={false}
        onRowClick={handleBlueprintClick}
        emptyMessage="No blueprints found."
      />

      {selectedBlueprint && (
        <BlueprintDetails
          blueprint={selectedBlueprint}
          calculator={calculator}
          defaultMarkupPercent={
            defaultMarkupPercent
          }
          activeCollection={activeCollection}
          craftTimer={craftTimer}
          onUpdateCollectionEntry={
            onUpdateCollectionEntry
          }
          onCraftBlueprint={onCraftBlueprint}
          onOpenCraftTimer={onOpenCraftTimer}
        />
      )}
    </section>
  )
}

export default BlueprintSearch