import BuildQueueView from '../../features/builds/BuildQueueView'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createTimerPress } from './TimerPress'
import BuildCraftTimer from '../BuildCraftTimer/BuildCraftTimer'
import { addBuild, toggleBuildStatus } from '../../features/builds/BuildQueueService'
import { allBlueprints } from '../../features/blueprints/blueprints'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'

describe('Compact timer gestures', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('taps to toggle without opening settings', () => {
    const tap = vi.fn(), settings = vi.fn(), press = createTimerPress(tap,settings)
    press.begin(10,10); vi.advanceTimersByTime(200); press.end(); press.click()
    vi.advanceTimersByTime(1000)
    expect(tap).toHaveBeenCalledTimes(1); expect(settings).not.toHaveBeenCalled()
  })
  it('long press opens settings once and release does not pause/resume', () => {
    const tap = vi.fn(), settings = vi.fn(), press = createTimerPress(tap,settings)
    press.begin(10,10); vi.advanceTimersByTime(650); vi.advanceTimersByTime(1000)
    press.end(); press.click()
    expect(settings).toHaveBeenCalledTimes(1); expect(tap).not.toHaveBeenCalled()
  })
  it('scrolling away cancels both long press and accidental tap', () => {
    const tap = vi.fn(), settings = vi.fn(), press = createTimerPress(tap,settings)
    press.begin(10,10); press.move(10,30); vi.advanceTimersByTime(1000); press.end(); press.click()
    expect(tap).not.toHaveBeenCalled(); expect(settings).not.toHaveBeenCalled()
  })
  it('small finger movement still permits holding', () => {
    const settings = vi.fn(), press = createTimerPress(vi.fn(),settings)
    press.begin(10,10); press.move(15,15); vi.advanceTimersByTime(650)
    expect(settings).toHaveBeenCalledTimes(1)
  })
  it('pointer cancel, leaving, or unmount clears pending settings', () => {
    const tap = vi.fn(), settings = vi.fn(), press = createTimerPress(tap,settings)
    press.begin(10,10); press.cancel(); vi.advanceTimersByTime(1000); press.click()
    expect(settings).not.toHaveBeenCalled(); expect(tap).not.toHaveBeenCalled()
  })
  it('a new tap after a hold resumes normal behavior', () => {
    const tap = vi.fn(), settings = vi.fn(), press = createTimerPress(tap,settings)
    press.begin(0,0); vi.advanceTimersByTime(650); press.end(); press.click()
    press.begin(0,0); press.end(); press.click()
    expect(settings).toHaveBeenCalledTimes(1); expect(tap).toHaveBeenCalledTimes(1)
  })
})

describe('Compact Build timer display', () => {
  const blueprint = allBlueprints.find(b => b.name === 'AA Blade')!
  const working = addBuild([],blueprint,resolveEconomicsSettings(),true,1000,'test')[0]
  it('shows the existing Build time and offers accessible settings', () => {
    const html = renderToStaticMarkup(createElement(BuildCraftTimer,{ build: working,blocked: false,onToggle: vi.fn(),onSettings: vi.fn() }))
    expect(html).toContain('blueprint-craft-timer-compact')
    expect(html).toContain('00:20:00'); expect(html).toContain('Tap to pause; hold for timer settings')
    expect(html).toContain('Timer settings for AA Blade')
  })
  it('keeps paused progress visible and makes tap resume rather than start a new Build', () => {
    const paused = toggleBuildStatus([working],working.id,61000)[0]
    const html = renderToStaticMarkup(createElement(BuildCraftTimer,{ build: paused,blocked: false,onToggle: vi.fn(),onSettings: vi.fn() }))
    expect(html).toContain('00:19:00'); expect(html).toContain('Tap to resume; hold for timer settings')
  })
  it('blocks a paused timer from starting when another Build owns active work', () => {
    const paused = toggleBuildStatus([working],working.id,61000)[0]
    const html = renderToStaticMarkup(createElement(BuildCraftTimer,{ build: paused,blocked: true,onToggle: vi.fn(),onSettings: vi.fn() }))
    expect(html).toContain('disabled'); expect(html).toContain('Pause the current Build first')
  })
})

describe('Inline queue timer workflow', () => {
  const blueprint = allBlueprints.find(b => b.name === 'AA Blade')!
  it('shows an Enqueued timer immediately and leaves its status as a message', () => {
    const builds = addBuild([],blueprint,resolveEconomicsSettings(),false,1000,'queued')
    const html = renderToStaticMarkup(createElement(BuildQueueView,{ builds,apply: vi.fn(),onTimer: vi.fn(),error: '' }))
    expect(html).toContain('Timer for AA Blade. Tap to start; hold for timer settings.')
    expect(html).toContain('00:20:00')
    expect(html).toContain('<span class="blueprint-access-status build-status build-status-enqueued">Enqueued</span>')
    expect(html).not.toContain('Enqueued: AA Blade. Tap to start.')
  })
  it('keeps a Working timer on its card without a separate active-work panel', () => {
    const builds = addBuild([],blueprint,resolveEconomicsSettings(),true,1000,'working')
    const html = renderToStaticMarkup(createElement(BuildQueueView,{ builds,apply: vi.fn(),onTimer: vi.fn(),error: '' }))
    expect(html).toContain('Tap to pause; hold for timer settings.')
    expect(html).toContain('<span class="blueprint-access-status build-status build-status-working">Working</span>')
    expect(html).not.toContain('build-active-notice')
  })
})

 describe('Top-only queue timer', () => {
  it('shows one timer and leaves lower status badges available for a confirmed switch', () => {
    const blueprint = allBlueprints.find(b => b.name === 'AA Blade')!
    const first = addBuild([],blueprint,resolveEconomicsSettings(),false,1000,'first')
    const builds = addBuild(first,blueprint,resolveEconomicsSettings(),false,1000,'second')
    const html = renderToStaticMarkup(createElement(BuildQueueView,{ builds,apply: vi.fn(),onTimer: vi.fn(),error: '' }))
    expect(html.match(/blueprint-craft-timer-compact/g)).toHaveLength(1)
    expect(html).toContain('Enqueued: AA Blade. Tap to move to top and start.')
  })
})
