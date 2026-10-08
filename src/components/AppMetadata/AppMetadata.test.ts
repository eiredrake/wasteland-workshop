import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import AppMetadata from './AppMetadata'
import { masterBlueprintsUpdatedAt } from '../../features/blueprints/blueprints'
import data from '../../data/wasteland-blueprints.json'
it('uses catalog normalization metadata and keeps the UTC date across user time zones', () => {
  expect(masterBlueprintsUpdatedAt).toBe(data.generatedAt)
  const html = renderToStaticMarkup(createElement(AppMetadata,{version:'0.6.1',blueprintsUpdatedAt:'2026-10-06T00:15:00Z'}))
  expect(html).toContain('v0.6.1')
  expect(html).toContain('Blueprints updated:')
  expect(html).toContain('dateTime="2026-10-06T00:15:00.000Z"')
  expect(html).toContain(new Date('2026-10-06T00:15:00Z').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}))
})
it('handles missing or invalid metadata without inventing an update date', () => {
  for (const blueprintsUpdatedAt of ['', 'not a date']) {
    const html = renderToStaticMarkup(createElement(AppMetadata,{version:'1',blueprintsUpdatedAt}))
    expect(html).toContain('Blueprints updated: Unknown'); expect(html).not.toContain('<time')
  }
})

