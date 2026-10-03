import { useState, type ReactNode } from 'react'
import Datalist from '../../components/Datalist/Datalist'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import { testBlueprints } from './testBlueprints'
import BlueprintDetails from './BlueprintDetails'
import './WorkshopView.css'
import type { CraftTimerState } from '../timer/CraftTimerState'

type WorkshopRow = {
  id: number
  name: string
  craftingSkill: string
  grade: string
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
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<Blueprint | null>(null)

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

  const normalizedSearch = searchText.trim().toLowerCase()

  const workshopRows: WorkshopRow[] = activeCollection.entries
    .map((entry) => {
      const blueprint = testBlueprints.find(
        (item) => item.id === entry.blueprintId
      )

      if (!blueprint) {
        return undefined
      }

      return {
        id: blueprint.id,
        name: blueprint.name,
        craftingSkill:
          blueprint.itemCraftings?.[0]?.craftingSkills ??
          'Unknown',
        grade: blueprint.grade,
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
        item.grade,
        item.status,
      ]

      return searchableFields.some((field) =>
        field
          .toLowerCase()
          .includes(normalizedSearch)
      )
    })

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
    },
    {
      key: 'grade',
      label: 'Grade',
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
        onRowClick={(item) =>
          setSelectedBlueprint(item.blueprint)
        }
        emptyMessage={
          normalizedSearch
            ? 'No matching blueprints found.'
            : 'No blueprints in this collection.'
        }
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

export default WorkshopView