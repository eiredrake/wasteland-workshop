import { useCalendarDay } from '../warehouse/useCalendarDay'
import { blueprintCraftability } from '../warehouse/CraftabilityService'
import type { Warehouse } from '../warehouse/Warehouse'
import { useState } from 'react'
import SharePreview from '../../components/SharePreview/SharePreview'
import { blueprintShareCard } from './BlueprintShareCard'
import type { ShareCard } from '../../sharing/ShareCard'
import type { Blueprint } from './Blueprint'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
} from './BlueprintCollection'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { CraftTimerState } from '../timer/CraftTimerState'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import './BlueprintDetails.css'
import BlueprintShoppingAction, { type BlueprintShoppingProps } from '../shopping/BlueprintShoppingAction'

const formatCredits = (value: number | undefined) => value === undefined ? 'Unknown' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })

type BlueprintDetailsProps = {
  warehouse?: Warehouse
  warehouseError?: string
  shopping: BlueprintShoppingProps
  blueprint: Blueprint
  mode: 'catalog' | 'collection'
  calculator: CostCalculator
  defaultMarkupPercent: number
  activeCollection: BlueprintCollection | undefined
  craftTimer: CraftTimerState
  onUpdateCollectionEntry: (
    blueprintId: number,
    blueprintName: string,
    status: BlueprintAccessStatus | undefined
  ) => void
  onCraftBlueprint: (blueprint: Blueprint) => void
  onAddBuild: (blueprint: Blueprint) => void
  onOpenCraftTimer: () => void
}

function BlueprintDetails({
  warehouse,
  warehouseError,
  shopping,
  blueprint,
  mode,
  calculator,
  defaultMarkupPercent,
  activeCollection,
  onUpdateCollectionEntry,
  onAddBuild,
}: BlueprintDetailsProps) {
  const [markupPercent, setMarkupPercent] =
    useState(defaultMarkupPercent)

  const [shareCard, setShareCard] = useState<ShareCard>()
  const today = useCalendarDay()
  const crafting = blueprint.itemCraftings?.[0]
  const availability = crafting && warehouse && !warehouseError ? blueprintCraftability(crafting,warehouse,today) : undefined

  const mind = crafting?.craftingMindCost ?? 0
  const minutes =
    crafting?.craftingTimeInMinute ?? 0
  const skills =
    crafting?.craftingSkills ??
    'No crafting data'

  const finalProduct =
    crafting?.craftingFinalProducts?.[0]
      ?.finalProduct

  const itemType = finalProduct?.kind
    ? finalProduct.kind
        .split('_')
        .map(
          (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(' ')
    : 'Unknown'

  const itemMechanics =
    finalProduct?.metadata?.mechanics?.trim()

  const uses =
    finalProduct?.metadata?.uses

  const requirementsToUse =
    finalProduct?.metadata?.requirementsToUse

  const lifetimeAmount =
    finalProduct?.lifetimeAmount

  const lifetimeUnit =
    finalProduct?.lifetimeUnit

  const expiration =
    lifetimeAmount && lifetimeUnit
      ? `${lifetimeAmount} ${lifetimeUnit}${
          lifetimeAmount === 1 ? '' : 's'
        }`
      : undefined

  const durationOfEffect =
    finalProduct?.metadata?.durationOfEffect

  const specialNotes =
    blueprint.metadata?.notes?.trim()

  const mindCost =
    calculator.calculateMindCost(mind)

  const resolveCost = calculator.calculateResolveCost(crafting?.craftingResolveCost ?? 0)

  const timeCost =
    calculator.calculateTimeCost(minutes)

  const costs = crafting
    ? calculateBlueprintCost(
        crafting,
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

  const collectionEntry =
    activeCollection?.entries.find(
      (entry) =>
        entry.blueprintId === blueprint.id
    )

    const collectionStatus = (() => {
      if (!collectionEntry) {
        return 'To Acquire'
      }
    
      if (collectionEntry.status === 'acquired') {
        return 'Acquired'
      }
    
      if (collectionEntry.status === 'to-acquire') {
        return 'To Acquire'
      }
    
      return 'To Sell'
    })()


  const updateCollectionStatus = (
    status:
      | BlueprintAccessStatus
      | undefined
  ) => {
    onUpdateCollectionEntry(
      blueprint.id,
      blueprint.name,
      status
    )
  }

  const cycleCollectionStatus = () => {
    if (mode === 'catalog') {
      if (!collectionEntry) {
        updateCollectionStatus(
          'to-acquire'
        )
        return
      }

      if (
        collectionEntry.status ===
        'to-acquire'
      ) {
        updateCollectionStatus(
          'acquired'
        )
        return
      }

      if (
        collectionEntry.status ===
        'acquired'
      ) {
        updateCollectionStatus(undefined)
        return
      }

      /*
       * To Sell cannot be entered from the
       * Master Catalog. An existing To Sell
       * entry returns to Acquired.
       */
      updateCollectionStatus('acquired')
      return
    }

    if (!collectionEntry) {
      updateCollectionStatus('acquired')
      return
    }

    if (
      collectionEntry.status ===
      'acquired'
    ) {
      updateCollectionStatus('to-acquire')
      return
    }

    if (
      collectionEntry.status ===
      'to-acquire'
    ) {
      updateCollectionStatus('sell')
      return
    }

    updateCollectionStatus('acquired')
  }

  return (
    <section className="blueprint-details">
      {shareCard && <SharePreview card={shareCard} onClose={() => setShareCard(undefined)} />}
      <header className="blueprint-details-header">
        <h2>{blueprint.name}</h2>
        <button type="button" className="blueprint-share-button" onClick={() => setShareCard(blueprintShareCard(blueprint, calculator))}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/></svg>
          Share Print
        </button>
      </header>

      {(itemMechanics ||
        skills ||
        specialNotes) && (
        <section className="blueprint-details-card blueprint-mechanics-card">
          {crafting && <button type="button" className="blueprint-access-status blueprint-build-button" onClick={() => onAddBuild(blueprint)}>Build</button>}
          <div className="blueprint-mechanics-section blueprint-crafting-skill">
            <h3>Crafting Skill</h3>
            <p>{skills}</p>
          </div>

          <div className="blueprint-mechanics-section">
            <h3>Item Type</h3>
            <p>{itemType}</p>
          </div>

          {uses !== undefined &&
            uses !== null && (
              <div className="blueprint-mechanics-section">
                <h3>Uses</h3>
                <p>{uses}</p>
              </div>
            )}

          {requirementsToUse && (
            <div className="blueprint-mechanics-section">
              <h3>
                Requirements To Use
              </h3>
              <p>{requirementsToUse}</p>
            </div>
          )}

          {expiration && (
            <div className="blueprint-mechanics-section">
              <h3>Expiration</h3>
              <p>{expiration}</p>
            </div>
          )}

          {durationOfEffect && (
            <div className="blueprint-mechanics-section">
              <h3>
                Duration of Effect
              </h3>
              <p>{durationOfEffect}</p>
            </div>
          )}

          {itemMechanics && (
            <div className="blueprint-mechanics-section">
              <h3>Item Mechanics</h3>
              <p>{itemMechanics}</p>
            </div>
          )}

          {specialNotes && (
            <div className="blueprint-mechanics-section">
              <h3>Special Notes</h3>
              <p>{specialNotes}</p>
            </div>
          )}
        </section>
      )}

      {warehouse && crafting && <section className="blueprint-details-card blueprint-access-card">
        <h3>Warehouse Materials</h3>
        {warehouseError ? <p>Warehouse unavailable. Open Warehouse to review the saved inventory problem.</p> : availability && <>
          <strong className={availability.materialsAvailable ? 'blueprint-materials-available' : 'blueprint-materials-missing'}>{availability.materialsAvailable
            ? 'Materials Available · Can Craft' + (availability.maxCopies === null ? ' · No material limit' : ' × ' + availability.maxCopies.toLocaleString()) : 'Missing Materials'}</strong>
          {!!availability.missing.length && <ul>{availability.missing.map((item,index) => <li key={index}>{item.name} × {item.quantity.toLocaleString()}{item.choice ? ' (choose a qualifying ingredient)' : ''}</li>)}</ul>}
          <p>Only dated, usable inventory (and non-expiring currency) counts. Material availability only. Skills, Mind, Resolve, crafting space, and other item eligibility rules still apply. Inventory is not reserved or consumed.</p>
        </>}
      </section>}
      <section className="blueprint-details-card blueprint-access-card">
        <div className="blueprint-card-heading">
          <h3>Blueprint Access</h3>
        </div>

        {activeCollection ? (
          <div className="blueprint-access-content">
            <div className="blueprint-access-info">
              <div className="blueprint-access-collection">
                <span>
                  Active Collection
                </span>

                <strong>
                  {activeCollection.name}
                </strong>

                <button
                  type="button"
                  className={`blueprint-access-status blueprint-access-status-${
                    collectionEntry
                      ?.status ??
                    'untracked'
                  }`}
                  onClick={
                    cycleCollectionStatus
                  }
                  title={`Change status in ${activeCollection.name}`}
                >
                  {collectionStatus}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>
            No active blueprint collection.
            Select one from Blueprint
            Collections to track this
            blueprint.
          </p>
        )}
      </section>

      <BlueprintShoppingAction blueprint={blueprint} shopping={shopping} />

      <div className="blueprint-details-grid">
        <section className="blueprint-details-card">
          <h3>Crafting</h3>

          <dl className="blueprint-stat-list">
            <div>
              <dt>Mind</dt>
              <dd>
                {mind}
                <span>{formatCredits(mindCost)}cr</span>
              </dd>
            </div>

            <div>
              <dt>Time</dt>
              <dd>
                {minutes} min
                <span>{formatCredits(timeCost)}cr</span>
              </dd>
            </div>

            <div>
              <dt>Resolve</dt>
              <dd>
                {crafting
                  ?.craftingResolveCost ??
                  0}
              </dd>
            </div>

            <div>
              <dt>Zone</dt>
              <dd>
                {crafting
                  ?.craftingZone ??
                  'Unknown'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="blueprint-details-card">
          <h3>Cost Summary</h3>

          <dl className="blueprint-cost-list">
            <div>
              <dt>Resolve ({crafting?.craftingResolveCost ?? 0})</dt>
              <dd>{formatCredits(resolveCost)}cr</dd>
            </div>
            <div>
              <dt>Labor</dt>
              <dd>
                {costs === undefined
                  ? 'Unknown'
                  : `${formatCredits(costs.laborCost)}cr`}
              </dd>
            </div>

            <div>
              <dt>Materials</dt>
              <dd>
                {costs === undefined
                  ? 'Unknown'
                  : `${formatCredits(costs.materialCost)}cr${
                      costs.hasUnknownComponentCosts
                        ? '*'
                        : ''
                    }`}
              </dd>
            </div>

            <div className="blueprint-cost-production">
              <dt>Production Cost</dt>
              <dd>
                {costs?.productionCost ===
                undefined
                  ? 'Unknown*'
                  : `${formatCredits(costs.productionCost)}cr`}
              </dd>
            </div>

            {costs?.productionCost !==
              undefined && (
              <>
                <div>
                  <dt>Markup</dt>
                  <dd>
                    <select
                      className="blueprint-markup-select"
                      value={
                        markupPercent
                      }
                      onChange={(
                        event
                      ) =>
                        setMarkupPercent(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                    >
                      <option value={0}>
                        0%
                      </option>
                      <option value={10}>
                        10%
                      </option>
                      <option value={20}>
                        20%
                      </option>
                      <option value={25}>
                        25%
                      </option>
                      <option value={50}>
                        50%
                      </option>
                    </select>
                  </dd>
                </div>

                <div className="blueprint-cost-selling">
                  <dt>
                    Selling Price
                  </dt>
                  <dd>
                    {formatCredits(sellingPrice)}cr
                  </dd>
                </div>

                <div>
                  <dt>Profit</dt>
                  <dd>{formatCredits(profit)}cr</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      </div>

      <section className="blueprint-details-card blueprint-components-card">
        <h3>Components</h3>

        {!costs ||
        costs.components.length === 0 ? (
          <p>
            No component data available.
          </p>
        ) : (
          <div className="blueprint-components">
            {costs.components.map(
              (component) => (
                <div
                  className="blueprint-component-row"
                  key={
                    component.itemId
                  }
                >
                  <strong>
                    {component.name}
                  </strong>

                  <span>
                    {component.quantity}
                    {component.unitCost !==
                      undefined &&
                      ` × ${formatCredits(component.unitCost)}cr`}
                  </span>

                  <strong className="blueprint-component-total">
                    {component.totalCost ===
                    undefined
                      ? 'Unknown'
                      : `${formatCredits(component.totalCost)}cr`}
                  </strong>
                </div>
              )
            )}
          </div>
        )}

        {costs?.hasUnknownComponentCosts && (
          <p className="blueprint-cost-warning">
            * Cost estimate is incomplete
            because one or more component
            values are unknown.
          </p>
        )}
      </section>
    </section>
  )
}

export default BlueprintDetails
