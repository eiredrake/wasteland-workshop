import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import EconomicsValuationExplanation from './EconomicsValuationExplanation'
import EconomicsSettingsView from './EconomicsSettingsView'
import { defaultEconomicsSettings, type EconomicsOverrides } from '../../economics/EconomicsSettings'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
const render = (overrides: EconomicsOverrides = {}) => renderToStaticMarkup(createElement(EconomicsValuationExplanation,{overrides}))
describe('valuation methodology', () => {
  it('starts collapsed and explains all cost formulas and rounding', () => {
    const html = render()
    expect(html).toContain('<summary>How Valuation Works</summary>')
    expect(html).not.toContain(' open=')
    for (const formula of ['Mind Cost = Mind Required × Mind Rate','Time Cost = Minutes Required × Time Rate','Resolve Cost = Resolve Required × Resolve Rate','Production Cost = Mind Cost + Time Cost + Resolve Cost + Material Cost','Material Cost = Σ (Quantity × Resource Unit Value)','Acquisition Unit Cost = ⌈','Selling Price = ⌈ Production Cost ×']) expect(html).toContain(formula)
    expect(html).toContain('round upward to a whole credit')
    expect(html).toContain('valuation-fraction')
  })
  it('uses shipped defaults and the expected illustrative results', () => {
    expect(defaultEconomicsSettings).toMatchObject({mindCostPerPoint:.4,timeCostPerMinute:.1,resolveCostPerPoint:15,foragingCardCost:4,defaultMarkupPercent:25})
    const html = render()
    for (const text of ['15 Mind × 0.4 = 6 credits','60 Minutes × 0.1 = 6 credits','Labor Cost (rounded once after summing Mind and Time) = 12 credits','Production Cost = 32 credits','Suggested Selling Price = 40 credits','Unit cost (unrounded acquisition total ÷ 3, then rounded up) = 3 credits per unit']) expect(html).toContain(text)
    expect(html).toContain('not actual Blueprint records')
  })
  it('updates examples using overrides and the existing calculator', () => {
    const overrides = {mindCostPerPoint:1,timeCostPerMinute:.2,foragingCardCost:0,defaultMarkupPercent:17}
    const html = render(overrides)
    const calculator = new DefaultCostCalculator(overrides)
    const production = calculator.calculateProductionCost({mind:15,minutes:60,materialCost:20,resolve:0})
    expect(html).toContain(`Production Cost = ${production} credits`)
    expect(html).toContain(`Suggested Selling Price = ${calculator.calculateSellingPrice(production,17)} credits`)
    expect(html).toContain('Default: 4 · Effective: 0')
    expect(html).toContain('Unit cost (unrounded acquisition total ÷ 3, then rounded up) = 3 credits per unit')
  })
  it('preserves zero rates and explains unknown and selector handling', () => {
    const html = render({mindCostPerPoint:0,timeCostPerMinute:0,resolveCostPerPoint:0,foragingCardCost:0,defaultMarkupPercent:0})
    expect(html).toContain('Labor Cost (rounded once after summing Mind and Time) = 0 credits')
    expect(html).toContain('Production Cost = 20 credits')
    expect(html).toContain('Suggested Selling Price = 20 credits')
    for (const text of ['Unknown, never silently zero','explicit zero valuation is valid','Any Herb','Anise or Geranium','Only methods with a foraging tier','pricing recommendation']) expect(html).toContain(text)
  })
  it('integrates into settings without saving or changing overrides', () => {
    const overrides = { mindCostPerPoint:0,resourceValues:{3857:0} }, before = structuredClone(overrides), save = vi.fn()
    const html = renderToStaticMarkup(createElement(EconomicsSettingsView,{currentOverrides:overrides,onSave:save}))
    expect(html).toContain('How Valuation Works'); expect(html).toContain('15 Mind × 0 = 0 credits')
    expect(overrides).toEqual(before); expect(save).not.toHaveBeenCalled()
    expect(html).toContain('Save Settings')
  })
})
