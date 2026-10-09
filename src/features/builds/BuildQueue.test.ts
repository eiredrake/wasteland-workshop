import { hasActiveQueueEntries } from './BuildQueueService'
import { createQueueSubmissionGuard } from './SubmissionGuard'
import { addActionActivity } from '../actions/ActionService'
import { actionCatalog } from '../actions/ActionCatalog'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import BlueprintDetails from '../blueprints/BlueprintDetails'
import BuildStatusBadge from '../../components/BuildStatusBadge/BuildStatusBadge'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { allBlueprints } from '../blueprints/blueprints'
import { adjustCraftTimerMinutes } from '../timer/CraftTimerEngine'
import { playAlarm } from '../timer/CraftAlarm'
import { BUILD_QUEUE_KEY, loadBuildQueue, saveBuildQueue } from './BuildQueueRepository'
import { ACTIVE_BUILD_MESSAGE, addBuild, enqueueBlueprintBuild, buildCalculator, calculateBuildCost, changeBuildTimer, createBuildCompletionTracker, deleteBuilds, editBuild, effectiveBuildEconomics, moveBuild, tickBuildQueue, toggleBuildStatus, startBuildAtTop, workingBuild } from './BuildQueueService'
import type { BuildQueue } from './Build'

const blueprint = allBlueprints.find(b => b.name === 'Sosweet Smashstick')!
const defaults = () => resolveEconomicsSettings()
const add = (queue: BuildQueue, id: string, immediate = false) => addBuild(queue,blueprint,defaults(),immediate,1000,id)
const queued = () => add(add([],'a'),'b')
const active = () => toggleBuildStatus(queued(),'a',2000)
function storage() {
  const values = new Map<string,string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key,value) } }
}

describe('Build creation and economic snapshots', () => {
  it('creates Enqueued instances with unique IDs, recipe snapshots and independent queue order', () => {
    const before = structuredClone(blueprint), first = addBuild([],blueprint,defaults()), queue = addBuild(first,blueprint,defaults())
    expect(queue).toHaveLength(2)
    expect(queue[0].id).not.toBe(queue[1].id)
    expect(queue.map(b => b.status)).toEqual(['Enqueued','Enqueued'])
    expect(queue[0].timer).toMatchObject({ status: 'idle', remainingMs: blueprint.itemCraftings![0].craftingTimeInMinute * 60000 })
    expect(queue[0].timer.endTimeMs).toBeUndefined()
    expect(queue[0].blueprintId).toBe(blueprint.id)
    expect(queue[0].recipe).not.toBe(blueprint.itemCraftings![0])
    expect(blueprint).toEqual(before)
  })
  it('captures effective global prices and keeps later Settings changes out of existing Builds', () => {
    const economics = resolveEconomicsSettings({ resourceValues: { 3868: 10 }, mindCostPerPoint: 0.8 })
    const queue = addBuild([],blueprint,economics,false,1000,'a')
    economics.resourceValues[3868] = 99; economics.mindCostPerPoint = 5
    expect(queue[0].economicSnapshot.resourceValues[3868]).toBe(10)
    expect(queue[0].economicSnapshot.mindCostPerPoint).toBe(0.8)
    const next = addBuild(queue,blueprint,economics,false,2000,'b')
    expect(next[1].economicSnapshot.resourceValues[3868]).toBe(99)
    expect(queue[0].economicSnapshot.resourceValues[3868]).toBe(10)
  })
  it('rejects duplicate Build IDs and missing recipes without changing the queue', () => {
    const queue = queued()
    expect(() => add(queue,'a')).toThrow('unique')
    expect(() => addBuild(queue,{ ...blueprint, itemCraftings: [] },defaults())).toThrow('recipe')
    expect(queue).toHaveLength(2)
  })
  it('reuses Blueprint formulas and actual Sosweet component data', () => {
    const build = queued()[0]
    expect(calculateBuildCost(build)).toEqual(calculateBlueprintCost(build.recipe,new DefaultCostCalculator()))
    expect(calculateBuildCost(build).materialCost).toBeCloseTo(76.8)
  })
  it('isolates resource and scalar Build overrides and resets to captured prices', () => {
    const settings = resolveEconomicsSettings({ resourceValues: { 3868: 10 } }), original = structuredClone(blueprint)
    const queue = addBuild(addBuild([],blueprint,settings,false,0,'a'),blueprint,settings,false,1,'b')
    const changed = editBuild(queue,'a','For Bob',{ resourceValues: { 3868: 12 }, mindCostPerPoint: 1, timeCostPerMinute: 2, resolveCostPerPoint: 3, foragingCardCost: 4, defaultMarkupPercent: 50 })
    expect(effectiveBuildEconomics(changed[0])).toMatchObject({ mindCostPerPoint: 1, timeCostPerMinute: 2, resolveCostPerPoint: 3, foragingCardCost: 4, defaultMarkupPercent: 50 })
    expect(buildCalculator(changed[0]).getEffectiveResourceValue(3868)).toBe(12)
    expect(buildCalculator(changed[1]).getEffectiveResourceValue(3868)).toBe(10)
    expect(settings.resourceValues[3868]).toBe(10)
    expect(blueprint).toEqual(original)
    const reset = editBuild(changed,'a','For Bob',{})
    expect(buildCalculator(reset[0]).getEffectiveResourceValue(3868)).toBe(10)
    expect(reset[0].notes).toBe('For Bob')
  })
  it('preserves zero overrides and unknown captured ingredients without default fallback', () => {
    const build = queued()[0]
    delete build.economicSnapshot.resourceValues[3868]
    expect(calculateBuildCost(build).productionCost).toBeUndefined()
    const changed = editBuild([build],build.id,'',{ resourceValues: { 3868: 0 } })
    expect(calculateBuildCost(changed[0]).materialCost).toBeCloseTo(48.8)
    expect(calculateBuildCost(build).productionCost).toBeUndefined()
  })
})

describe('Status workflow and one authoritative active timer', () => {
  it('starts Enqueued without changing its position and records its first start', () => {
    const queue = toggleBuildStatus(queued(),'b',5000)
    expect(queue.map(b => b.id)).toEqual(['a','b'])
    expect(queue[1]).toMatchObject({ status: 'Working', startedAt: 5000 })
    expect(queue[1].timer.endTimeMs).toBe(5000 + queue[1].timer.originalDurationMs)
    expect(queue.filter(b => b.status === 'Working')).toHaveLength(1)
  })
  it('pauses with deadline-based remaining time and resumes without restarting full time', () => {
    const working = active(), paused = toggleBuildStatus(working,'a',62000)
    expect(paused[0].status).toBe('Paused')
    expect(paused[0].timer.remainingMs).toBe(working[0].timer.originalDurationMs - 60000)
    expect(paused[0].timer.endTimeMs).toBeUndefined()
    const resumed = toggleBuildStatus(paused,'a',200000)
    expect(resumed[0].timer.endTimeMs).toBe(200000 + paused[0].timer.remainingMs)
    expect(resumed[0].startedAt).toBe(2000)
    expect(resumed[0].status).toBe('Working')
  })
  it('rejects starting Enqueued while another works without pausing or altering either', () => {
    const queue = active(), before = structuredClone(queue)
    expect(() => toggleBuildStatus(queue,'b',6000)).toThrow(ACTIVE_BUILD_MESSAGE)
    expect(queue).toEqual(before)
  })
  it('rejects resuming Paused while another works, until explicit pause', () => {
    let queue = toggleBuildStatus(active(),'a',5000)
    queue = toggleBuildStatus(queue,'b',6000)
    const before = structuredClone(queue)
    expect(() => toggleBuildStatus(queue,'a',7000)).toThrow(ACTIVE_BUILD_MESSAGE)
    expect(queue).toEqual(before)
    queue = toggleBuildStatus(queue,'b',8000)
    queue = toggleBuildStatus(queue,'a',9000)
    expect(workingBuild(queue)?.id).toBe('a')
    expect(queue[1].status).toBe('Paused')
  })
  it('routes Blueprint timer to new Working Build at the top, immediately running', () => {
    const queue = add(queued(),'c',true)
    expect(queue.map(b => b.id)).toEqual(['c','a','b'])
    expect(queue[0]).toMatchObject({ status: 'Working', startedAt: 1000 })
    expect(queue[0].timer.status).toBe('running')
  })
  it('rejects Blueprint timer without creating a duplicate or pausing active work', () => {
    const queue = active(), before = structuredClone(queue)
    expect(() => add(queue,'c',true)).toThrow(ACTIVE_BUILD_MESSAGE)
    expect(queue).toEqual(before)
    const paused = toggleBuildStatus(queue,'a',5000)
    expect(add(paused,'c',true)[0].status).toBe('Working')
  })
  it('completes at deadline, retains history and never starts the next Build', () => {
    const queue = active(), end = queue[0].timer.endTimeMs!, finished = tickBuildQueue(queue,end + 50000)
    expect(finished[0]).toMatchObject({ status: 'Completed', completedAt: end })
    expect(finished[0].timer).toMatchObject({ status: 'complete', remainingMs: 0, endTimeMs: undefined })
    expect(finished[1].status).toBe('Enqueued')
    expect(workingBuild(finished)).toBeUndefined()
    expect(toggleBuildStatus(finished,'a',end + 1)).toBe(finished)
    expect(() => changeBuildTimer(finished,'a',{ ...finished[0].timer, status: 'running' })).toThrow('Completed')
  })
  it('pausing after deadline completes rather than preserving expired work', () => {
    const queue = active()
    expect(toggleBuildStatus(queue,'a',queue[0].timer.endTimeMs! + 1)[0].status).toBe('Completed')
  })
  it('uses existing adjustment engine and rejects a second timer owner', () => {
    const queue = active(), timer = adjustCraftTimerMinutes(queue[0].timer,-1,2000)
    expect(changeBuildTimer(queue,'a',timer)[0].timer.remainingMs).toBe(queue[0].timer.remainingMs - 60000)
    expect(() => changeBuildTimer(queue,'b',{ ...queue[1].timer,status: 'running',endTimeMs: 12345 })).toThrow(ACTIVE_BUILD_MESSAGE)
  })
  it('keeps Enqueued duration fixed until its status badge starts the job', () => {
    const queue = queued()
    expect(() => changeBuildTimer(queue,'a',adjustCraftTimerMinutes(queue[0].timer,-1))).toThrow('Start this Activity')
    expect(queue[0].timer.remainingMs).toBe(queue[0].timer.originalDurationMs)
  })
  it('does not reset started work back to Enqueued through timer controls', () => {
    const queue = active()
    expect(() => changeBuildTimer(queue,'a',{ ...queue[0].timer,status: 'idle',endTimeMs: undefined })).toThrow('not reset')
    expect(queue[0].status).toBe('Working')
  })
  it('handles zero-duration jobs as Completed without a phantom active timer', () => {
    const zero = { ...blueprint,itemCraftings: [{ ...blueprint.itemCraftings![0],craftingTimeInMinute: 0 }] }
    const queue = addBuild([],zero,defaults(),true,1000,'a')
    expect(queue[0].status).toBe('Completed')
    expect(toggleBuildStatus(addBuild([],zero,defaults(),false,1000,'b'),'b',2000)[0].status).toBe('Completed')
  })
  it('consumes completion once before the existing sound/vibration output', async () => {
    const queue = active(), tracker = createBuildCompletionTracker(queue), sound = vi.fn(async () => true), vibrate = vi.fn(() => true)
    expect(tracker(queue)).toEqual([])
    const finished = tickBuildQueue(queue,queue[0].timer.endTimeMs!)
    await Promise.all(tracker(finished).map(() => playAlarm({ sound: true,vibration: true },{ sound,vibrate })))
    expect(tracker(finished)).toEqual([])
    expect(tracker(tickBuildQueue(finished,9999999))).toEqual([])
    expect(sound).toHaveBeenCalledTimes(1); expect(vibrate).toHaveBeenCalledTimes(1)
    expect(createBuildCompletionTracker(finished)(finished)).toEqual([])
  })
})

describe('Order, notes, history, and deletion', () => {
  it.each(['Enqueued','Paused','Completed'] as const)('reorders %s without changing data other than array position', status => {
    let queue = queued()
    if (status !== 'Enqueued') queue = toggleBuildStatus(queue,'a',1000)
    if (status === 'Paused') queue = toggleBuildStatus(queue,'a',3000)
    if (status === 'Completed') queue = tickBuildQueue(queue,queue[0].timer.endTimeMs!)
    queue = editBuild(queue,'a','Notes',{ resourceValues: { 3868: 12 } })
    const a = structuredClone(queue[0]), moved = moveBuild(queue,'a',1)
    expect(moved.map(b => b.id)).toEqual(['b','a'])
    expect(moved[1]).toEqual(a)
    expect(queue[0]).toEqual(a)
  })
  it('locks Working position, even when other Builds reorder around it; pausing unlocks it', () => {
    const queue = add(active(),'c'), before = structuredClone(queue)
    expect(() => moveBuild(queue,'a',1)).toThrow('Pause')
    expect(queue).toEqual(before)
    expect(moveBuild(queue,'c',-1).map(b => b.id)).toEqual(['a','c','b'])
    expect(moveBuild(toggleBuildStatus(queue,'a',3000),'a',1).map(b => b.id)).toEqual(['b','a','c'])
  })
  it('supports editing notes at every status, including stable completed history', () => {
    let queue = queued()
    for (const [status, now] of [['Enqueued',0],['Working',1000],['Paused',3000],['Working',4000],['Completed',99999999]] as const) {
      if (status === 'Completed') queue = tickBuildQueue(queue,now)
      else if (status !== queue[0].status) queue = toggleBuildStatus(queue,'a',now)
      const cost = calculateBuildCost(queue[0]), changed = editBuild(queue,'a','For Bob - paid 50cr',queue[0].overrides)
      expect(changed[0].status).toBe(status)
      expect(changed[0].notes).toBe('For Bob - paid 50cr')
      expect(calculateBuildCost(changed[0])).toEqual(cost)
      queue = changed
    }
  })
  it.each(['Enqueued','Paused','Completed'] as const)('deletes %s while retaining other Builds', status => {
    let queue = queued()
    if (status !== 'Enqueued') queue = toggleBuildStatus(queue,'a',1000)
    if (status === 'Paused') queue = toggleBuildStatus(queue,'a',2000)
    if (status === 'Completed') queue = tickBuildQueue(queue,99999999)
    expect(deleteBuilds(queue,['a']).map(b => b.id)).toEqual(['b'])
  })
  it('protects Working from individual/bulk deletion, then permits deletion after pause', () => {
    const queue = active(), before = structuredClone(queue)
    expect(() => deleteBuilds(queue,['a'])).toThrow('Pause')
    expect(() => deleteBuilds(queue,['a','b'])).toThrow('Pause')
    expect(queue).toEqual(before)
    expect(deleteBuilds(toggleBuildStatus(queue,'a',3000),['a','b'])).toEqual([])
  })
  it('deletes multiple Completed records while retaining unselected work', () => {
    let queue = tickBuildQueue(active(),99999999)
    queue = tickBuildQueue(toggleBuildStatus(queue,'b',100000000),200000000)
    queue = add(queue,'c')
    expect(deleteBuilds(queue,['a','b']).map(b => b.id)).toEqual(['c'])
  })
  it('renders terminal and blocked badges correctly, without circular status controls', () => {
    const queue = active(), toggle = vi.fn()
    const blocked = renderToStaticMarkup(createElement(BuildStatusBadge,{ build: queue[1],blocked: true,onToggle: toggle }))
    expect(blocked).toContain('disabled'); expect(blocked).toContain('Pause the current Activity first')
    const completed = tickBuildQueue(queue,9999999)[0]
    const markup = renderToStaticMarkup(createElement(BuildStatusBadge,{ build: completed,blocked: false,onToggle: toggle }))
    expect(markup).toContain('<span'); expect(markup).not.toContain('<button')
    expect(toggle).not.toHaveBeenCalled()
  })
})

describe('Queue persistence and deadline restoration', () => {
  it('round trips order, notes, overrides, economics, status, and paused progress', () => {
    const store = storage()
    let queue = toggleBuildStatus(active(),'a',5000)
    queue = moveBuild(editBuild(queue,'a','For Bob',{ resourceValues: { 3868: 0 } }),'a',1)
    saveBuildQueue(queue,store)
    expect(loadBuildQueue(store,99999999)).toEqual(queue)
  })
  it('reconstructs Working remaining time from deadline after reload', () => {
    const store = storage(), queue = active(); saveBuildQueue(queue,store)
    const restored = loadBuildQueue(store,62000)
    expect(restored[0].status).toBe('Working')
    expect(restored[0].timer.remainingMs).toBe(queue[0].timer.remainingMs - 60000)
    expect(restored[0].timer.endTimeMs).toBe(queue[0].timer.endTimeMs)
  })
  it('restores expired Working as Completed with original deadline timestamp', () => {
    const store = storage(), queue = active(); saveBuildQueue(queue,store)
    const restored = loadBuildQueue(store,queue[0].timer.endTimeMs! + 60000)
    expect(restored[0]).toMatchObject({ status: 'Completed',completedAt: queue[0].timer.endTimeMs })
    expect(restored[1].status).toBe('Enqueued')
    saveBuildQueue(restored,store)
    expect(loadBuildQueue(store,99999999)).toEqual(restored)
  })
  it('retains completed notes/costs and actually removes deleted persisted records', () => {
    const store = storage(), completed = tickBuildQueue(active(),99999999)
    const queue = editBuild(completed,'a','Historical notes',{ resourceValues: { 3868: 12 } })
    const cost = calculateBuildCost(queue[0]); saveBuildQueue(queue,store)
    expect(calculateBuildCost(loadBuildQueue(store,999999999)[0])).toEqual(cost)
    expect(loadBuildQueue(store,999999999)[0].notes).toBe('Historical notes')
    saveBuildQueue(deleteBuilds(queue,['a']),store)
    expect(loadBuildQueue(store).map(b => b.id)).toEqual(['b'])
  })
  it.each(['{','{"version":99,"builds":[]}','{"version":1,"builds":[{}]}'])('rejects malformed/unsupported storage and leaves it untouched: %s', raw => {
    const store = storage(); store.setItem(BUILD_QUEUE_KEY,raw)
    expect(() => loadBuildQueue(store)).toThrow()
    expect(store.getItem(BUILD_QUEUE_KEY)).toBe(raw)
  })
  it('rejects multiple Working jobs, duplicate IDs, or inconsistent timer/status storage', () => {
    const store = storage(), queue = active()
    saveBuildQueue([queue[0],{ ...queue[0],id: 'c' }],store)
    expect(() => loadBuildQueue(store)).toThrow('invalid')
    saveBuildQueue([queue[0],queue[0]],store)
    expect(() => loadBuildQueue(store)).toThrow('invalid')
    saveBuildQueue([{ ...queue[0],status: 'Paused' }],store)
    expect(() => loadBuildQueue(store)).toThrow('invalid')
  })
  it('reports unavailable storage rather than silently losing queued work', () => {
    const denied = { getItem: () => { throw new Error('denied') },setItem: () => { throw new Error('denied') } }
    expect(() => loadBuildQueue(denied)).toThrow('denied')
    expect(() => saveBuildQueue(queued(),denied)).toThrow('denied')
  })
})

 describe('Confirmed switch to a queued Build', () => {
  it('preserves the active remaining time, moves the target to the top and starts it', () => {
    const original=active();expect(()=>startBuildAtTop(original,'b',62000)).toThrow(ACTIVE_BUILD_MESSAGE)
    const next = startBuildAtTop(toggleBuildStatus(original,'a',62000),'b',62000)
    expect(next.map(b => b.id)).toEqual(['b','a'])
    expect(next[0].status).toBe('Working')
    expect(next[1].status).toBe('Paused')
    expect(next[1].timer.remainingMs).toBe(next[1].timer.originalDurationMs - 60000)
    expect(next.filter(b => b.status === 'Working')).toHaveLength(1)
  })
  it('resumes a paused target with its preserved time', () => {
    const paused = toggleBuildStatus(active(),'a',62000)
    const other = toggleBuildStatus(paused,'b',63000)
    expect(()=>startBuildAtTop(other,'a',64000)).toThrow(ACTIVE_BUILD_MESSAGE)
    const next = startBuildAtTop(toggleBuildStatus(other,'b',64000),'a',64000)
    expect(next[0].id).toBe('a')
    expect(next[0].timer.remainingMs).toBe(next[0].timer.originalDurationMs - 60000)
    expect(next[1].status).toBe('Paused')
  })
  it('rejects completed targets without changing the active Build', () => {
    const done = tickBuildQueue(active(),99999999)
    const queue = toggleBuildStatus(done,'b',99999999)
    expect(() => startBuildAtTop(queue,'a',100000000)).toThrow('Completed')
    expect(workingBuild(queue)?.id).toBe('b')
  })
})

describe('Blueprint Build action', () => {
  it('starts the first Build immediately at the top of an empty queue', () => {
    const next = enqueueBlueprintBuild([],blueprint,defaults(),1000,'first')
    expect(next[0].status).toBe('Working')
    expect(next[0].timer.endTimeMs).toBe(1000 + next[0].timer.originalDurationMs)
  })
  it('appends to a nonempty queue without changing active work', () => {
    const before = active(), next = enqueueBlueprintBuild(before,blueprint,defaults(),62000,'new')
    expect(next.slice(0,2)).toEqual(before)
    expect(next[2].status).toBe('Enqueued')
    expect(next[2].timer.endTimeMs).toBeUndefined()
  })
  it('does not auto-start when existing entries are paused or completed', () => {
    const paused = toggleBuildStatus(active(),'a',62000)
    expect(enqueueBlueprintBuild(paused,blueprint,defaults(),63000,'new').at(-1)?.status).toBe('Enqueued')
    const completed = tickBuildQueue([active()[0]],99999999)
    expect(enqueueBlueprintBuild(completed,blueprint,defaults(),99999999,'new').find(build=>build.id==='new')?.status).toBe('Working')
  })
})

it('collection Blueprint details offer one Build badge without a timer or separate enqueue button', () => {
  const html = renderToStaticMarkup(createElement(BlueprintDetails,{
    blueprint, mode: 'collection', calculator: new DefaultCostCalculator(defaults()), defaultMarkupPercent: 0,
    activeCollection: {id:'collection',name:'Test',entries:[{blueprintId:blueprint.id,status:'acquired'}]},
    craftTimer: add([], 'timer')[0].timer, onUpdateCollectionEntry: vi.fn(), onCraftBlueprint: vi.fn(), onAddBuild: vi.fn(), onOpenCraftTimer: vi.fn(),
    shopping: {lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()}
  }))
  expect(html).toContain('blueprint-build-button')
  expect(html).toContain('>Build</button>')
  expect(html).not.toContain('Add to Build Queue')
  expect(html).not.toContain('blueprint-craft-timer')
})


describe('context-sensitive queue creation', () => {
  const render = (buildQueue: BuildQueue) => renderToStaticMarkup(createElement(BlueprintDetails, {
    buildQueue, blueprint, mode:'catalog', calculator:new DefaultCostCalculator(defaults()), defaultMarkupPercent:0,
    activeCollection:undefined, craftTimer:add([],'timer')[0].timer,
    onUpdateCollectionEntry:vi.fn(),onCraftBlueprint:vi.fn(),onAddBuild:vi.fn(),onOpenCraftTimer:vi.fn(),
    shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()}
  }))
  it.each(['Enqueued','Paused','Working'] as const)('%s displays Add to Queue and preserves all existing data/order', status => {
    let queue = queued()
    if(status!=='Enqueued')queue=toggleBuildStatus(queue,'a',2000)
    if(status==='Paused')queue=toggleBuildStatus(queue,'a',62000)
    const before=structuredClone(queue)
    expect(hasActiveQueueEntries(queue)).toBe(true)
    expect(render(queue)).toContain('Add to<br/>Queue')
    expect(render(queue)).toContain('blueprint-build-queued')
    const next=enqueueBlueprintBuild(queue,blueprint,defaults(),63000,'new')
    expect(next.slice(0,queue.length)).toEqual(before)
    expect(next.at(-1)).toMatchObject({status:'Enqueued',timer:{status:'idle'}})
    expect(next.at(-1)?.timer.endTimeMs).toBeUndefined()
    expect(queue).toEqual(before)
  })
  it('empty queue and completed history display Build; transitions derive from current entries', () => {
    const history=tickBuildQueue([active()[0]],99999999)
    for(const queue of [[],history]) {
      expect(hasActiveQueueEntries(queue)).toBe(false)
      expect(render(queue)).toContain('>Build</button>')
      const next=enqueueBlueprintBuild(queue,blueprint,defaults(),100000000,'new')
      expect(next[0].status).toBe('Working')
      expect(render(next)).toContain('Add to<br/>Queue')
      expect(render(next.filter(b=>b.id!=='new'))).toContain('>Build</button>')
    }
  })
  it('rechecks authoritative queue at submission instead of the earlier displayed state', () => {
    expect(render([])).toContain('>Build</button>')
    const current=active(),next=enqueueBlueprintBuild(current,blueprint,defaults(),62000,'late')
    expect(next.slice(0,current.length)).toEqual(current)
    expect(next.at(-1)?.status).toBe('Enqueued')
    const saved=storage();saveBuildQueue(next,saved)
    const restored=loadBuildQueue(saved,63000)
    expect(restored[0].timer.endTimeMs).toBe(current[0].timer.endTimeMs)
    expect(restored.at(-1)?.timer.endTimeMs).toBeUndefined()
    expect(restored.at(-1)?.recipe).toEqual(blueprint.itemCraftings![0])
    expect(calculateBuildCost(restored.at(-1)!)).toEqual(calculateBuildCost(next.at(-1)!))
  })
  it.each(['Enqueued','Paused','Working'] as const)('Actions preserve existing %s work and append idle', status => {
    let queue=queued()
    if(status!=='Enqueued')queue=toggleBuildStatus(queue,'a',2000)
    if(status==='Paused')queue=toggleBuildStatus(queue,'a',62000)
    const next=addActionActivity(queue,actionCatalog[0],'explore',{},defaults(),undefined,undefined,63000,'action')
    expect(next.slice(0,queue.length)).toEqual(queue)
    expect(next.at(-1)).toMatchObject({status:'Enqueued',timer:{status:'idle'}})
  })
  it('blocks double and reentrant submissions but permits later intentional additions', () => {
    let now=1000;const submit=createQueueSubmissionGuard(()=>now),operation=vi.fn(()=>true)
    expect(submit(()=>{expect(submit(operation)).toBe(false);return operation()})).toBe(true)
    expect(submit(operation)).toBe(false);expect(operation).toHaveBeenCalledTimes(1)
    now+=751;expect(submit(operation)).toBe(true)
  })
  it('validation failures or exceptions release the submission guard immediately', () => {
    const submit=createQueueSubmissionGuard(()=>1000)
    expect(submit(()=>false)).toBe(false)
    expect(()=>submit(()=>{throw new Error('Invalid configuration')})).toThrow('Invalid configuration')
    expect(submit(()=>true)).toBe(true)
  })
})
