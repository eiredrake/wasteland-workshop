import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { addBuild, adjustBuildTimerMinutes, createBuildCompletionTracker, toggleBuildStatus } from './BuildQueueService'
import { allBlueprints } from '../blueprints/blueprints'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { loadBuildQueue, saveBuildQueue } from './BuildQueueRepository'
import CraftTimer from '../../components/CraftTimer/CraftTimer'
const blueprint = allBlueprints.find(b => b.name === 'AA Blade')!
const working = () => addBuild([],blueprint,resolveEconomicsSettings(),true,1000,'first')
describe('timer configuration', () => {
  it('opening the full Timer page preserves state and exposes direct minute adjustments', () => {
    const build=working()[0], before=structuredClone(build), change=vi.fn()
    const html=renderToStaticMarkup(createElement(CraftTimer,{timer:build.timer,onChange:change}))
    expect(html).toContain('AA Blade')
    expect(html).toContain('aria-label="Add one minute"')
    expect(html).toContain('aria-label="Remove one minute"')
    expect(html).not.toContain('<dialog')
    expect(html).not.toContain('>Apply</button>')
    expect(html).not.toContain('>Timer Settings</button>')
    expect(change).not.toHaveBeenCalled();expect(build).toEqual(before)
  })
  it('adds and subtracts from elapsed running time, keeping it Working', () => {
    const queue = working()
    const added = adjustBuildTimerMinutes(queue,'first',2,61000)[0]
    expect(added.timer.remainingMs).toBe(21*60000); expect(added.timer.endTimeMs).toBe(61000+21*60000)
    expect(added.status).toBe('Working')
    const subtracted = adjustBuildTimerMinutes(queue,'first',-2,61000)[0]
    expect(subtracted.timer.remainingMs).toBe(17*60000); expect(subtracted.status).toBe('Working')
    expect(queue[0].timer.remainingMs).toBe(20*60000)
  })
  it('adjusts only the selected paused Build while another is Working', () => {
    const paused = toggleBuildStatus(working(),'first',61000)
    const queue = addBuild(paused,blueprint,resolveEconomicsSettings(),true,62000,'second')
    const result = adjustBuildTimerMinutes(queue,'first',1,122000)
    expect(result.find(b=>b.id==='first')!.status).toBe('Paused')
    expect(result.find(b=>b.id==='first')!.timer.remainingMs).toBe(20*60000)
    expect(result.find(b=>b.id==='second')).toEqual(queue.find(b=>b.id==='second'))
    expect(result.filter(b=>b.status==='Working')).toHaveLength(1)
  })
  it('does not revive a Build that expired while settings were open', () => {
    const result = adjustBuildTimerMinutes(working(),'first',10,1201000)
    expect(result[0].status).toBe('Completed'); expect(result[0].timer.remainingMs).toBe(0)
    expect(() => adjustBuildTimerMinutes(result,'first',1)).toThrow('Only Working or Paused')
  })
  it('subtraction to zero completes and completion is reported once', () => {
    const queue = working(), completed = adjustBuildTimerMinutes(queue,'first',-30,61000)
    const track = createBuildCompletionTracker(queue)
    expect(completed[0].status).toBe('Completed')
    expect(track(completed)).toEqual(['first']); expect(track(completed)).toEqual([])
  })
  it('persists adjusted deadline and restores remaining elapsed time', () => {
    const queue = adjustBuildTimerMinutes(working(),'first',2,61000)
    let raw = ''
    const storage = {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}}
    saveBuildQueue(queue,storage)
    const restored = loadBuildQueue(storage,121000)
    expect(restored[0].timer.remainingMs).toBe(20*60000); expect(restored[0].status).toBe('Working')
  })
  it('keeps full timer desktop controls and adds accessible settings', () => {
    const html = renderToStaticMarkup(createElement(CraftTimer,{timer:working()[0].timer,onChange:vi.fn(),onSettings:vi.fn()}))
    expect(html).toContain('>Stop</button>'); expect(html).toContain('>Timer Settings</button>')
    expect(html).toContain('press F2'); expect(html).toContain('tabindex="0"')
  })
})
