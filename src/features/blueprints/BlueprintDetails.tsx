import type { Blueprint } from './Blueprint'
import { costCalculator } from '../../economics/calculator'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import {
  calculateResourceValuations,
  findResourceEconomics,
} from '../../economics/ResourceValuationService'

type BlueprintDetailsProps = {
  blueprint: Blueprint
}

function BlueprintDetails({ blueprint }: BlueprintDetailsProps) {
  const crafting = blueprint.itemCraftings?.[0]

  const mind = crafting?.craftingMindCost ?? blueprint.mind
  const minutes = crafting?.craftingTimeInMinute ?? blueprint.minutes
  const skills = crafting?.craftingSkills ?? blueprint.skill

  const mindCost = costCalculator.calculateMindCost(mind)
  const timeCost = costCalculator.calculateTimeCost(minutes)

  const laborCost = costCalculator.calculateProductionCost({
    mind: mind,
    minutes: minutes,
    materialCost: 0,
    resolveCost: 0,
  })
  

  const getComponentUnitCost = (itemId: number): number | undefined => {
    const resourceEconomics = findResourceEconomics(
      itemId,
      testResourceEconomics
    )

    if (!resourceEconomics) {
      return undefined
    }

    const valuations = calculateResourceValuations(
      resourceEconomics,
      costCalculator
    )

    return valuations[0]?.calculatedCost
  }

  const components =
    blueprint.itemCraftings?.[0]?.craftingComponents.map(
      (craftingComponent) => ({
        id: craftingComponent.component.id,
        name: craftingComponent.component.name,
        quantity: craftingComponent.amount,
      })
    ) ?? blueprint.components

  const materialCost = components.reduce((total, component) => {
    const unitCost = getComponentUnitCost(component.id)

    if (unitCost === undefined) {
      return total
    }

    return total + unitCost * component.quantity
  }, 0)

  const hasUnknownComponentCosts = components.some(
    (component) => getComponentUnitCost(component.id) === undefined
  )

  const productionCost = hasUnknownComponentCosts
    ? undefined
    : costCalculator.calculateProductionCost({
        mind: blueprint.mind,
        minutes: blueprint.minutes,
        materialCost,
        resolveCost: 0,
      })

  return (
    <section>
      <h2>{blueprint.name}</h2>

      <p>
        {blueprint.grade} {skills}
      </p>

      <p>Kind: {blueprint.kind}</p>

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

      {components.length === 0 ? (
        <p>No component data available.</p>
      ) : (
        <ul>
          {components.map((component) => {
            const unitCost = getComponentUnitCost(component.id)

            return (
              <li key={component.id}>
                {component.quantity} × {component.name}
                {unitCost !== undefined && (
                  <>
                    {' '}— {unitCost}cr each —{' '}
                    {unitCost * component.quantity}cr
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p>Labor Cost: {laborCost}cr</p>

      <p>
        Material Cost:{' '}
        {hasUnknownComponentCosts ? 'Unknown' : `${materialCost}cr`}
      </p>

      <p>
        <strong>
          Production Cost:{' '}
          {productionCost === undefined ? 'Unknown' : `${productionCost}cr`}
        </strong>
      </p>
    </section>
  )
}

export default BlueprintDetails