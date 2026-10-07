import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCompletionTracker, playAlarm, prepareAlarmAudio, testAlarm } from './CraftAlarm'
import { ALARM_SETTINGS_KEY, loadAlarmSettings, saveAlarmSettings } from './AlarmSettings'
import { adjustCraftTimerMinutes, beginCraftTimer, loadCraftTimer, pauseCraftTimer, resetCraftTimer, resumeCraftTimer, tickCraftTimer } from './CraftTimerEngine'

afterEach(() => { vi.unstubAllGlobals() })

describe('completion alarms', () => {
  it('Test Alarm honors both disabled settings without requesting device output', async () => {
    const vibrate = vi.fn()
    const audio = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('AudioContext', audio)
    expect(await testAlarm({ sound: false, vibration: false })).toContain('Alarm sound off.')
    expect(vibrate).not.toHaveBeenCalled()
    expect(audio).not.toHaveBeenCalled()
  })
  it('does not queue audio or resume a suspended context on automatic completion', async () => {
    vi.resetModules()
    const resume = vi.fn(), start = vi.fn()
    vi.stubGlobal('AudioContext', class {
      state = 'suspended'; resume = resume; createOscillator = start
    })
    const alarm = await import('./CraftAlarm')
    expect(await alarm.playAlarm({ sound: true, vibration: false })).toContain('Sound blocked')
    expect(resume).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })
  it('fires once after expiry, including repeated ticks/effect replay/settings changes', async () => {
    const completed = createCompletionTracker('idle')
    const sound = vi.fn().mockResolvedValue(true)
    let timer = beginCraftTimer(loadCraftTimer(1), 1000)
    completed(timer.status)
    timer = tickCraftTimer(timer, 61000)
    for (let i = 0; i < 4; i++) {
      timer = tickCraftTimer(timer, 62000 + i)
      if (completed(timer.status)) await playAlarm({ sound: true, vibration: false }, { sound })
    }
    expect(sound).toHaveBeenCalledTimes(1)
    timer = beginCraftTimer(resetCraftTimer(timer), 100000)
    completed(timer.status)
    expect(completed(tickCraftTimer(timer, 160000).status)).toBe(true)
  })
  it('tracks independent timers and ignores an already complete initial state', () => {
    const first = createCompletionTracker('running')
    const second = createCompletionTracker('running')
    expect(first('complete')).toBe(true)
    expect(first('complete')).toBe(false)
    expect(second('running')).toBe(false)
    expect(second('complete')).toBe(true)
    expect(createCompletionTracker('complete')('complete')).toBe(false)
  })
  it('sound disabled prevents audio, vibration disabled prevents vibration', async () => {
    const sound = vi.fn().mockResolvedValue(true)
    const vibrate = vi.fn().mockReturnValue(true)
    await playAlarm({ sound: false, vibration: true }, { sound, vibrate })
    expect(sound).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledOnce()
    vibrate.mockClear()
    await playAlarm({ sound: true, vibration: false }, { sound, vibrate })
    expect(sound).toHaveBeenCalledOnce()
    expect(vibrate).not.toHaveBeenCalled()
  })
  it('unsupported/blocked/throwing devices do not cause an error', async () => {
    expect(await playAlarm({ sound: false, vibration: true }, { sound: vi.fn() })).toContain('unsupported')
    expect(await playAlarm({ sound: true, vibration: true }, {
      sound: vi.fn().mockRejectedValue(new Error('blocked')), vibrate: () => { throw new Error('blocked') },
    })).toContain('unavailable')
    expect(await playAlarm({ sound: true, vibration: true }, {
      sound: vi.fn().mockResolvedValue(false), vibrate: () => false,
    })).toContain('blocked')
  })
  it('plays the built-in three-tone sound after user activation', async () => {
    const start = vi.fn(), stop = vi.fn()
    const resume = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('AudioContext', class {
      state = 'running'; currentTime = 0; destination = {}; resume = resume
      createOscillator() { return { frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start, stop } }
      createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() } }
    })
    await prepareAlarmAudio()
    expect(await playAlarm({ sound: true, vibration: false })).toContain('Sound played')
    expect(start).toHaveBeenCalledTimes(3)
    expect(stop).toHaveBeenCalledTimes(3)
  })
})

describe('alarm settings storage', () => {
  it('defaults on, persists both switches, reloads false values', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    expect(loadAlarmSettings(storage)).toEqual({ sound: true, vibration: true })
    saveAlarmSettings({ sound: false, vibration: false }, storage)
    expect(values.has(ALARM_SETTINGS_KEY)).toBe(true)
    expect(loadAlarmSettings(storage)).toEqual({ sound: false, vibration: false })
    values.set(ALARM_SETTINGS_KEY, '{bad')
    expect(loadAlarmSettings(storage)).toEqual({ sound: true, vibration: true })
    values.set(ALARM_SETTINGS_KEY, '{"sound":"false","vibration":false}')
    expect(loadAlarmSettings(storage)).toEqual({ sound: true, vibration: false })
  })
})

describe('timer behavior', () => {
  it('catches up from absolute time after suspension without counting interval ticks', () => {
    const timer = beginCraftTimer(loadCraftTimer(10), 1000)
    expect(tickCraftTimer(timer, 301000).remainingMs).toBe(300000)
    expect(tickCraftTimer(timer, 900000).status).toBe('complete')
  })
  it('preserves pause, resume, adjustment and reset behavior', () => {
    let timer = beginCraftTimer(loadCraftTimer(2, 'Blueprint'), 1000)
    timer = pauseCraftTimer(timer, 31000)
    expect(tickCraftTimer(timer, 900000).remainingMs).toBe(90000)
    timer = resumeCraftTimer(timer, 900000)
    expect(timer.endTimeMs).toBe(990000)
    timer = adjustCraftTimerMinutes(timer, -1, 900000)
    expect(timer.remainingMs).toBe(30000)
    timer = resetCraftTimer(timer)
    expect(timer.status).toBe('idle')
    expect(timer.remainingMs).toBe(120000)
    expect(timer.label).toBe('Blueprint')
  })
})
