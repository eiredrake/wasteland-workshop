import { useState } from 'react'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import type { CostCalculator } from '../../economics/CostCalculator'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'

type BlueprintDetailsProps = {
  blueprint: Blueprint
  calculator: CostCalculator
  defaultMarkupPercent: number
  activeCollection: BlueprintCollection | undefined
  onUpdateCollectionEntry: (
    blueprintId: number,
    blueprintName: string,
    status: BlueprintAccessStatus | undefined
  ) => void
}

function BlueprintDetails({
  blueprint,
  calculator,
  defaultMarkupPercent,
  activeCollection,
  onUpdateCollectionEntry,
}: BlueprintDetailsProps) {
  const [markupPercent, setMarkupPercent] =
    useState(defaultMarkupPercent)

  const crafting = blueprint.itemCraftings?.[0]

  const mind = crafting?.craftingMindCost ?? 0
  const minutes = crafting?.craftingTimeInMinute ?? 0
  const skills = crafting?.craftingSkills ?? 'No crafting data'

  const mindCost = calculator.calculateMindCost(mind)
  const timeCost = calculator.calculateTimeCost(minutes)

  const costs = crafting
    ? calculateBlueprintCost(
        crafting,
        testResourceEconomics,
        calculator
      )
    : undefined

  const sellingPrice =
    costs?.productionCost === undefined
      ? undefined
      : calculator.calculateSellingPrice(
          costs.productionCost,
          markupPercent
        )

  const profit =
    sellingPrice === undefined ||
    costs?.productionCost === undefined
      ? undefined
      : sellingPrice - costs.productionCost

  const collectionEntry = activeCollection?.entries.find(
    (entry) => entry.blueprintId === blueprint.id
  )

  const collectionStatus =
    collectionEntry?.status === 'acquired'
      ? 'Acquired'
      : collectionEntry?.status === 'to-acquire'
        ? 'To Acquire'
        : 'Not tracked'

  const updateCollectionStatus = (
    status: BlueprintAccessStatus | undefined
  ) => {
    onUpdateCollectionEntry(
      blueprint.id,
      blueprint.name,
      status
    )
  }

  return (
    <section>
      <h2>{blueprint.name}</h2>

      <p>
        {blueprint.grade} {skills}
      </p>

      <p>Kind: {blueprint.kind}</p>

      <h3>Blueprint Access</h3>

      {activeCollection ? (
        <>
          <p>
            Active Collection:{' '}
            <strong>{activeCollection.name}</strong>
          </p>

          <p>
            Status: <strong>{collectionStatus}</strong>
          </p>

          <div className="blueprint-access-actions">
            {collectionEntry?.status !== 'acquired' && (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  updateCollectionStatus('acquired')
                }
              >
                Mark Acquired
              </button>
            )}

            {collectionEntry?.status !== 'to-acquire' && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateCollectionStatus('to-acquire')
                }
              >
                To Acquire
              </button>
            )}

            {collectionEntry && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateCollectionStatus(undefined)
                }
              >
                Remove
              </button>
            )}
          </div>
        </>
      ) : (
        <p>
          No active blueprint collection. Select one from Blueprint
          Collections to track this blueprint.
        </p>
      )}

      <p>
        Mind: {mind} — {mindCost}cr
      </p>

      <p>
        Time: {minutes} minutes — {timeCost}cr
      </p>

      {crafting && (
        <>
          <p>Resolve: {crafting.craftingResolveCost}</p>
          <p>Crafting Zone: {crafting.craftingZone}</p>
        </>
      )}

      <h3>Components</h3>

      {!costs || costs.components.length === 0 ? (
        <p>No component data available.</p>
      ) : (
        <ul>
          {costs.components.map((component) => (
            <li key={component.itemId}>
              {component.quantity} × {component.name}
              {component.unitCost !== undefined &&
                component.totalCost !== undefined && (
                  <>
                    {' '}— {component.unitCost}cr each —{' '}
                    {component.totalCost}cr
                  </>
                )}
            </li>
          ))}
        </ul>
      )}

      <p>
        Labor Cost:{' '}
        {costs === undefined
          ? 'Unknown'
          : `${costs.laborCost}cr`}
      </p>

      <p>
        Material Cost:{' '}
        {costs === undefined
          ? 'Unknown'
          : `${costs.materialCost}cr${
              costs.hasUnknownComponentCosts ? '*' : ''
            }`}
      </p>

      <p>
        <strong>
          Production Cost:{' '}
          {costs?.productionCost === undefined
            ? 'Unknown*'
            : `${costs.productionCost}cr`}
        </strong>
      </p>

      {costs?.productionCost !== undefined && (
        <>
          <p>
            <label>
              Markup:{' '}
              <select
                value={markupPercent}
                onChange={(event) =>
                  setMarkupPercent(
                    Number(event.target.value)
                  )
                }
              >
                <option value={0}>0%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={25}>25%</option>
                <option value={50}>50%</option>
              </select>
            </label>
          </p>

          <p>
            <strong>
              Selling Price: {sellingPrice}cr
            </strong>
          </p>

          <p>Profit: {profit}cr</p>
        </>
      )}

      {costs?.hasUnknownComponentCosts && (
        <p>
          * Cost estimate is incomplete because one or more component
          values are unknown.
        </p>
      )}
    </section>
  )
}

export default BlueprintDetails