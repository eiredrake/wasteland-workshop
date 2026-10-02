import type { Blueprint } from './Blueprint'
import { costCalculator } from '../../economics/calculator'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'

type BlueprintDetailsProps = {
  blueprint: Blueprint
}

function BlueprintDetails({ blueprint }: BlueprintDetailsProps) {
  const crafting = blueprint.itemCraftings?.[0]

  const mind = crafting?.craftingMindCost ?? 0
  const minutes = crafting?.craftingTimeInMinute ?? 0
  const skills = crafting?.craftingSkills ?? 'No crafting data'

  const mindCost = costCalculator.calculateMindCost(mind)
  const timeCost = costCalculator.calculateTimeCost(minutes)
  
  const costs = crafting
    ? calculateBlueprintCost(
        crafting,
        testResourceEconomics,
        costCalculator
      )
    : undefined

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
        {costs === undefined ? 'Unknown' : `${costs.laborCost}cr`}
      </p>

      <p>
        Material Cost:{' '}
        {costs === undefined
          ? 'Unknown'
          : `${costs.materialCost}cr${costs.hasUnknownComponentCosts ? '*' : ''}`}
      </p>

      <p>
        <strong>
          Production Cost:{' '}
          {costs?.productionCost === undefined
            ? 'Unknown*'
            : `${costs.productionCost}cr`}
        </strong>
      </p>

      {costs?.hasUnknownComponentCosts && (
        <p>
          * Cost estimate is incomplete because one or more component values are unknown.
        </p>
      )}
    </section>
  )
}

export default BlueprintDetails