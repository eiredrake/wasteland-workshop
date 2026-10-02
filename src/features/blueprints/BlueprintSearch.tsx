import { useState } from 'react'
import Datalist from '../../components/Datalist/Datalist'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { Blueprint } from './Blueprint'
import { testBlueprints } from './testBlueprints'
import BlueprintDetails from './BlueprintDetails'
import './BlueprintSearch.css'

const blueprintColumns: { key: keyof Blueprint; label: string }[] = [
  { key: 'name', label: 'Blueprint' },
  { key: 'kind', label: 'Kind' },
  { key: 'grade', label: 'Grade' },
]

type BlueprintSearchProps = {
  calculator: CostCalculator
  defaultMarkupPercent: number
}

function BlueprintSearch({
  calculator,
  defaultMarkupPercent,
}: BlueprintSearchProps) {
  const [searchText, setSearchText] = useState('')
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<Blueprint | null>(null)

  const normalizedSearch = searchText.trim().toLowerCase()

  const handleBlueprintClick = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint)
  }

  const filteredBlueprints = testBlueprints.filter((blueprint) => {
    const searchableFields = [
      blueprint.name,
      blueprint.kind,
      blueprint.grade,
      blueprint.itemCraftings?.[0]?.craftingSkills ?? '',
    ]

    return searchableFields.some((field) =>
      field.toLowerCase().includes(normalizedSearch)
    )
  })

  return (
    <section>
      <div className="blueprint-search">
      <span className="blueprint-search-icon" aria-hidden="true" />

        <input
          type="search"
          placeholder="Search blueprints..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      <Datalist<Blueprint>
        title="Blueprints"
        items={filteredBlueprints}
        columns={blueprintColumns}
        getRowKey={(blueprint) => blueprint.id}
        showAddButton={false}
        onRowClick={handleBlueprintClick}
        emptyMessage="No blueprints found."
      />

      {selectedBlueprint && (
        <BlueprintDetails
        blueprint={selectedBlueprint}
        calculator={calculator}
        defaultMarkupPercent={defaultMarkupPercent}
        />
      )}
    </section>
  )
}

export default BlueprintSearch