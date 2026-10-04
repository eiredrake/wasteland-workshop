import { useState, type ReactNode } from 'react'
import Datalist from '../../components/Datalist/Datalist'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import { masterBlueprints } from './blueprints'
import BlueprintDetails from './BlueprintDetails'
import './WorkshopView.css'
import type { CraftTimerState } from '../timer/CraftTimerState'

type WorkshopRow = {
  id: number
  name: string
  craftingSkill: string
  kind: string
  status: BlueprintAccessStatus
  blueprint: Blueprint
}

type WorkshopViewProps = {
  activeCollection: BlueprintCollection | undefined
  calculator: CostCalculator
  defaultMarkupPercent: number
  craftTimer: CraftTimerState
  onOpenCraftTimer: () => void
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

function formatKind(kind: string | undefined) {
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

function WorkshopView({
  activeCollection,
  calculator,
  defaultMarkupPercent,
  craftTimer,
  onUpdateCollectionEntry,
  onCraftBlueprint,
  onOpenCraftTimer,
}: WorkshopViewProps) {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<
  'all' | BlueprintAccessStatus
>('all')

  if (!activeCollection) {
    return (
      <section className="workshop-page">
        <div className="workshop-no-collection">
          <h2>No Active Blueprint Collection</h2>

          <p>
            Select an active collection from Blueprint Collections to view
            its blueprints here.
          </p>
        </div>
      </section>
    )
  }

  const normalizedSearch =
    searchText.trim().toLowerCase()

  const workshopRows: WorkshopRow[] =
    activeCollection.entries
      .map((entry) => {
        const blueprint = masterBlueprints.find(
          (item) => item.id === entry.blueprintId
        )

        if (!blueprint) {
          return undefined
        }

        return {
          id: blueprint.id,
          name: blueprint.name,
          craftingSkill:
            blueprint.itemCraftings?.[0]
              ?.craftingSkills ?? 'Unknown',
          kind: formatKind(
            blueprint.itemCraftings?.[0]
              ?.craftingFinalProducts?.[0]
              ?.finalProduct.kind
          ),
          status: entry.status,
          blueprint,
        }
      })
      .filter(
        (item): item is WorkshopRow =>
          item !== undefined
      )
      .filter((item) => {
        const searchableFields = [
          item.name,
          item.craftingSkill,
          item.kind,
          item.status,
        ]

        return searchableFields.some((field) =>
          field
            .toLowerCase()
            .includes(normalizedSearch)
        )
      })

      .filter((item) =>
        statusFilter === 'all'
          ? true
          : item.status === statusFilter
      )      

  const workshopColumns: {
    key: keyof WorkshopRow
    label: string
    render?: (item: WorkshopRow) => ReactNode
  }[] = [
    {
      key: 'name',
      label: 'Blueprint',
    },
    {
      key: 'craftingSkill',
      label: 'Crafting Skill',
      render: (item) => (
        <span className="workshop-crafting-skill">
          {item.craftingSkill}
        </span>
      )
    },
    {
      key: 'kind',
      label: 'Kind',
      render: (item) => (
        <span className="workshop-kind">
          {item.kind}
        </span>
      )      
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span
          className={`workshop-status workshop-status-${item.status}`}
        >
          {item.status === 'acquired'
            ? 'Acquired'
            : 'To Acquire'}
        </span>
      ),
    },
  ]

  const acquiredCount =
    activeCollection.entries.filter(
      (entry) => entry.status === 'acquired'
    ).length

  const toAcquireCount =
    activeCollection.entries.filter(
      (entry) => entry.status === 'to-acquire'
    ).length

  return (
    <section className="workshop-page">
      <header className="workshop-active-collection">
        <div>
          <span className="workshop-active-label">
            Active Collection
          </span>

          <h2>{activeCollection.name}</h2>
        </div>

        <div className="workshop-active-counts">
          <span>{acquiredCount} acquired</span>
          <span>{toAcquireCount} to acquire</span>
        </div>
      </header>

      <div className="workshop-filters">
        <button
          type="button"
          className={
            statusFilter === 'all'
              ? 'workshop-filter active'
              : 'workshop-filter'
          }
          onClick={() => setStatusFilter('all')}
        >
          All ({activeCollection.entries.length})
        </button>

        <button
          type="button"
          className={
            statusFilter === 'acquired'
              ? 'workshop-filter active'
              : 'workshop-filter'
          }
          onClick={() => setStatusFilter('acquired')}
        >
          Acquired ({acquiredCount})
        </button>

        <button
          type="button"
          className={
            statusFilter === 'to-acquire'
              ? 'workshop-filter active'
              : 'workshop-filter'
          }
          onClick={() => setStatusFilter('to-acquire')}
        >
          To Acquire ({toAcquireCount})
        </button>
      </div>      

      <div className="blueprint-search">
        <span
          className="blueprint-search-icon"
          aria-hidden="true"
        />

        <input
          type="search"
          placeholder={`Search ${activeCollection.name}...`}
          value={searchText}
          onChange={(event) =>
            setSearchText(event.target.value)
          }
        />
      </div>

      <Datalist<WorkshopRow>
        items={workshopRows}
        columns={workshopColumns}
        getRowKey={(item) => item.id}
        showAddButton={false}
        emptyMessage={
          normalizedSearch
            ? 'No matching blueprints found.'
            : 'No blueprints in this collection.'
        }
        backLabel={`Back to ${activeCollection.name}`}
        renderDetails={(item) => (
          <BlueprintDetails
            blueprint={item.blueprint}
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
            onOpenCraftTimer={
              onOpenCraftTimer
            }
          />
        )}
      />
    </section>
  )
}

export default WorkshopView