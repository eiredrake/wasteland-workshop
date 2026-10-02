import { useState } from 'react'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import type { CostCalculator } from '../../economics/CostCalculator'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import './BlueprintDetails.css'

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
        : 'Not Tracked'

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
    <section className="blueprint-details">
      <header className="blueprint-details-header">
        <h2>{blueprint.name}</h2>

        <div className="blueprint-details-subtitle">
          <span>{blueprint.grade}</span>
          <span>·</span>
          <span>{skills}</span>
        </div>
      </header>

      <section className="blueprint-details-card blueprint-access-card">
        <div className="blueprint-card-heading">
          <h3>Blueprint Access</h3>

          {activeCollection && (
            <span
              className={`blueprint-access-status blueprint-access-status-${
                collectionEntry?.status ?? 'untracked'
              }`}
            >
              {collectionStatus}
            </span>
          )}
        </div>

        {activeCollection ? (
          <>
            <div className="blueprint-access-collection">
              <span>Active Collection</span>
              <strong>{activeCollection.name}</strong>
            </div>

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
      </section>

      <div className="blueprint-details-grid">
        <section className="blueprint-details-card">
          <h3>Crafting</h3>

          <dl className="blueprint-stat-list">
            <div>
              <dt>Mind</dt>
              <dd>
                {mind}
                <span>{mindCost}cr</span>
              </dd>
            </div>

            <div>
              <dt>Time</dt>
              <dd>
                {minutes} min
                <span>{timeCost}cr</span>
              </dd>
            </div>

            <div>
              <dt>Resolve</dt>
              <dd>{crafting?.craftingResolveCost ?? 0}</dd>
            </div>

            <div>
              <dt>Zone</dt>
              <dd>{crafting?.craftingZone ?? 'Unknown'}</dd>
            </div>
          </dl>
        </section>

        <section className="blueprint-details-card">
          <h3>Cost Summary</h3>

          <dl className="blueprint-cost-list">
            <div>
              <dt>Labor</dt>
              <dd>
                {costs === undefined
                  ? 'Unknown'
                  : `${costs.laborCost}cr`}
              </dd>
            </div>

            <div>
              <dt>Materials</dt>
              <dd>
                {costs === undefined
                  ? 'Unknown'
                  : `${costs.materialCost}cr${
                      costs.hasUnknownComponentCosts ? '*' : ''
                    }`}
              </dd>
            </div>

            <div className="blueprint-cost-production">
              <dt>Production Cost</dt>
              <dd>
                {costs?.productionCost === undefined
                  ? 'Unknown*'
                  : `${costs.productionCost}cr`}
              </dd>
            </div>

            {costs?.productionCost !== undefined && (
              <>
                <div>
                  <dt>Markup</dt>
                  <dd>
                    <select
                      className="blueprint-markup-select"
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
                  </dd>
                </div>

                <div className="blueprint-cost-selling">
                  <dt>Selling Price</dt>
                  <dd>{sellingPrice}cr</dd>
                </div>

                <div>
                  <dt>Profit</dt>
                  <dd>{profit}cr</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      </div>

      <section className="blueprint-details-card blueprint-components-card">
        <h3>Components</h3>

        {!costs || costs.components.length === 0 ? (
          <p>No component data available.</p>
        ) : (
          <div className="blueprint-components">
            {costs.components.map((component) => (
              <div
                className="blueprint-component-row"
                key={component.itemId}
              >
                <strong>{component.name}</strong>

                <span>
                  {component.quantity}
                  {component.unitCost !== undefined &&
                    ` × ${component.unitCost}cr`}
                </span>

                <strong className="blueprint-component-total">
                  {component.totalCost === undefined
                    ? 'Unknown'
                    : `${component.totalCost}cr`}
                </strong>
              </div>
            ))}
          </div>
        )}

        {costs?.hasUnknownComponentCosts && (
          <p className="blueprint-cost-warning">
            * Cost estimate is incomplete because one or more component
            values are unknown.
          </p>
        )}
      </section>
    </section>
  )
}

export default BlueprintDetails