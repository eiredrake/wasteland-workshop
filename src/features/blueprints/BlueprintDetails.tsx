import type { Blueprint } from './Blueprint'
import { costCalculator } from '../../economics/calculator'

type BlueprintDetailsProps = {
  blueprint: Blueprint
}

function BlueprintDetails({ blueprint }: BlueprintDetailsProps) {
  const mindCost = costCalculator.calculateMindCost(blueprint.mind)
  const timeCost = costCalculator.calculateTimeCost(blueprint.minutes)

  const laborCost = costCalculator.calculateProductionCost({
    mind: blueprint.mind,
    minutes: blueprint.minutes,
    materialCost: 0,
    resolveCost: 0,
  })
  return (
    
    <section>
      <h2>{blueprint.name}</h2>

      <p>
        {blueprint.grade} {blueprint.skill}
      </p>

      <p>
        Mind: {blueprint.mind} — {mindCost}cr
      </p>

      <p>
        Time: {blueprint.minutes} minutes — {timeCost}cr
      </p>

      <p>
        Resolve: {blueprint.resolve}
      </p>

      <p>
        <strong>Labor Cost: {laborCost}cr</strong>
      </p>
    </section>
  )
}

export default BlueprintDetails