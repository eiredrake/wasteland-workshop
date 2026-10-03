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

const getBlueprintColumns = (
  activeCollection: BlueprintCollection | undefined
) => [
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
        return '—'
      }

      const entry = activeCollection.entries.find(
        (entry) =>
          entry.blueprintId === blueprint.id
      )

      if (entry?.status === 'acquired') {
        return 'Acquired'
      }

      if (entry?.status === 'to-acquire') {
        return 'To Acquire'
      }

      return '—'
    },
  },
]

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
  const [quickAddAcquired, setQuickAddAcquired] =
    useState(false)

  const normalizedSearch =
    searchText.trim().toLowerCase()

  const handleBlueprintClick = (
    blueprint: Blueprint
  ) => {
    if (quickAddAcquired && activeCollection) {
      const existingEntry =
        activeCollection.entries.find(
          (entry) =>
            entry.blueprintId === blueprint.id
        )

      if (existingEntry?.status === 'acquired') {
        return
      }

      onUpdateCollectionEntry(
        blueprint.id,
        blueprint.name,
        'acquired'
      )

      return
    }

    setSelectedBlueprint(blueprint)
  }

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
      {activeCollection && (
        <div className="blueprint-quick-add">
          <label>
            <input
              type="checkbox"
              checked={quickAddAcquired}
              onChange={(event) =>
                setQuickAddAcquired(
                  event.target.checked
                )
              }
            />

            Quick Add Acquired to{' '}
            <strong>
              {activeCollection.name}
            </strong>
          </label>
        </div>
      )}

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
        columns={getBlueprintColumns(activeCollection)}
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