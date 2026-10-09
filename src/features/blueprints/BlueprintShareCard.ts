import { formatCredits } from '../../economics/Credits'
import type { Blueprint } from './Blueprint'
import type { CostCalculator } from '../../economics/CostCalculator'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import type { ShareCard } from '../../sharing/ShareCard'
export function blueprintShareCard(blueprint: Blueprint, calculator: CostCalculator): ShareCard {
  const sections: ShareCard['sections'] = []
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && String(value).trim() && !/^(n\/?a|not applicable)$/i.test(String(value).trim())) sections.push({ label, text: String(value).trim() })
  }
  const crafting = blueprint.itemCraftings?.[0]
  const product = crafting?.craftingFinalProducts?.[0]?.finalProduct
  if (crafting) {
    add('Crafting Skill', crafting.craftingSkills)
    add('Components', crafting.craftingComponents.map(component => `${component.amount} × ${component.component.name}`).join('\n'))
    add('Mind Cost', crafting.craftingMindCost)
    add('Crafting Time', `${crafting.craftingTimeInMinute} min`)
    const cost = calculateBlueprintCost(crafting, calculator)
    add('Production Cost', cost.productionCost === undefined ? 'Unknown — one or more component values are unknown.' : formatCredits(cost.productionCost))
  }
  add('Uses', product?.metadata?.uses)
  if (product?.lifetimeAmount !== null && product?.lifetimeAmount !== undefined && product.lifetimeUnit) add('Expiration', `${product.lifetimeAmount} ${product.lifetimeUnit}${product.lifetimeAmount === 1 ? '' : 's'}`)
  add('Requirements to Use', product?.metadata?.requirementsToUse)
  add('Item Mechanics', product?.metadata?.mechanics)
  add('Special Notes', blueprint.metadata?.notes)
  return { title: blueprint.name, sections, footer: `Blueprint #${blueprint.id}${crafting ? ' · Production cost uses current Economics Settings.' : ''}` }
}
