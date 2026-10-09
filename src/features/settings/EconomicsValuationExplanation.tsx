import { formatCreditAmount } from '../../economics/Credits'
import { defaultEconomicsSettings, type EconomicsOverrides, resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { calculateResourceValuation } from '../../economics/ResourceValuation'
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
export default function EconomicsValuationExplanation({ overrides, invalid = false }: { overrides: EconomicsOverrides; invalid?: boolean }) {
  const settings = resolveEconomicsSettings(overrides)
  const calculator = new DefaultCostCalculator(overrides)
  const mind = calculator.calculateMindCost(15), time = calculator.calculateTimeCost(60)
  const production = calculator.calculateProductionCost({mind:15,minutes:60,resolve:0,materialCost:20})
  const selling = calculator.calculateSellingPrice(production,settings.defaultMarkupPercent)
  const acquisition = {name:'Illustrative foraging method',mind:5,minutes:10,resolve:0,materialCost:0,foragingTier:'basic' as const,yieldQuantity:3}
  const acquisitionTotal = calculator.calculateProductionCost(acquisition) + calculator.calculateForagingCardCost()
  const unitCost = calculateResourceValuation(0, acquisition, calculator).calculatedCost!
  return <details className="settings-card economics-methodology">
    <summary>How Valuation Works</summary>
    <p>Rates and examples below use the valid values currently shown in this form. Save Settings to apply your edits throughout the app.</p>
    {invalid && <p className="economics-note">Correct invalid overrides to preview them. Invalid values are excluded from these examples.</p>}
    <h3>Labor and production</h3>
    <p className="valuation-equation">Mind Cost = Mind Required × Mind Rate</p>
    <p className="valuation-equation">Time Cost = Minutes Required × Time Rate</p>
    <p className="valuation-equation">Resolve Cost = Resolve Required × Resolve Rate</p>
    <p className="valuation-equation">Production Cost = Mind Cost + Time Cost + Resolve Cost + Material Cost</p>
    <dl className="valuation-rates">
      <div><dt>Mind · credits per point</dt><dd>Default: {number(defaultEconomicsSettings.mindCostPerPoint)} · Effective: {number(settings.mindCostPerPoint)}</dd></div>
      <div><dt>Time · credits per minute</dt><dd>Default: {number(defaultEconomicsSettings.timeCostPerMinute)} · Effective: {number(settings.timeCostPerMinute)}</dd></div>
      <div><dt>Resolve · credits per point</dt><dd>Default: {number(defaultEconomicsSettings.resolveCostPerPoint)} · Effective: {number(settings.resolveCostPerPoint)}</dd></div>
      <div><dt>Foraging Card · credits per card</dt><dd>Default: {formatCreditAmount(defaultEconomicsSettings.foragingCardCost)} · Effective: {formatCreditAmount(settings.foragingCardCost)}</dd></div>
      <div><dt>Markup</dt><dd>Default: {number(defaultEconomicsSettings.defaultMarkupPercent)}% · Effective: {number(settings.defaultMarkupPercent)}%</dd></div>
    </dl>
    <h3>Materials</h3>
    <p className="valuation-equation">Material Cost = Σ (Quantity × Resource Unit Value)</p>
    <p>Σ means add the cost of each required material. Unit values use Ayden’s Econtism defaults unless you set an override. Resource valuation is separate from acquisition cost; different acquisition methods can cost different amounts.</p>
    <p>Unmapped resources remain Unknown, never silently zero. An explicit zero valuation is valid. Recipe selectors such as “Any Herb” and alternatives such as “Anise or Geranium” are requirements, not individual resources. No arbitrary ingredient value is assigned; an unresolved requirement leaves the production estimate Unknown. The materials subtotal includes only known values and is marked incomplete when any value is unknown.</p>
    <h3>Acquisition</h3>
    <div className="valuation-equation valuation-fraction-equation"><span>Acquisition Unit Cost = ⌈</span><span className="valuation-fraction"><span>Mind Cost + Time Cost + Resolve Cost + Material Cost + Foraging Card Cost</span><span>Yield Quantity</span></span><span>⌉</span></div>
    <p>⌈…⌉ means round upward to a whole credit, after dividing by the yield. Only methods with a foraging tier include one Foraging Card cost. Missing yield defaults to one; zero or invalid yield gives Unknown. Required resources use their acquisition-method costs, not configured blueprint unit valuations; missing acquisition costs also give Unknown. Acquisition estimates do not replace your resource valuations.</p>
    <h3>Suggested selling price</h3>
    <div className="valuation-equation valuation-fraction-equation"><span>Selling Price = ⌈ Production Cost × (1 +</span><span className="valuation-fraction"><span>Markup %</span><span>100</span></span><span>) ⌉</span></div>
    <p>Round upward to a whole credit after applying markup. This is a pricing recommendation, not an automatic market price or guaranteed profit.</p>
    <p>All displayed credit amounts round upward. Inputs and per-point/per-minute calculation rates retain precision. Totals use unrounded values, so displayed parts may not sum to the displayed total. Markup also uses unrounded production cost.</p><h3>Worked examples</h3>
    <p>Illustrations only, not actual Blueprint records. These results change with your effective rates.</p>
    <div className="valuation-example">
      <p>15 Mind × {number(settings.mindCostPerPoint)} = {formatCreditAmount(mind)} credits</p>
      <p>60 Minutes × {number(settings.timeCostPerMinute)} = {formatCreditAmount(time)} credits</p>
      <p>Labor Cost (rounded once after summing Mind and Time) = {formatCreditAmount(mind + time)} credits</p>
      <p>With 20 credits of materials and 0 Resolve: Production Cost = {formatCreditAmount(production)} credits</p>
      <p>At {number(settings.defaultMarkupPercent)}% markup: Suggested Selling Price = {formatCreditAmount(selling)} credits</p>
    </div>
    <div className="valuation-example">
      <p>A foraging method uses 5 Mind, 10 minutes, 0 Resolve, no materials and one card, yielding 3 units.</p>
      <p>Acquisition total (rounded for display) = {formatCreditAmount(acquisitionTotal)} credits</p>
      <p>Unit cost (unrounded acquisition total ÷ 3, then rounded up) = {formatCreditAmount(unitCost)} credits per unit</p>
    </div>
  </details>
}
