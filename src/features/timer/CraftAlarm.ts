import type { AlarmSettings } from './AlarmSettings'
import type { CraftTimerStatus } from './CraftTimerState'

// One tracker per timer owner, never per display. Consume before side effects.
export function createCompletionTracker(initial: CraftTimerStatus) {
  let previous = initial
  return (status: CraftTimerStatus) => {
    const completed = previous !== 'complete' && status === 'complete'
    previous = status
    return completed
  }
}

let context: AudioContext | undefined
function audioContext() {
  context ??= new AudioContext()
  return context
}

// Called synchronously from a user gesture to satisfy mobile autoplay policies.
export async function prepareAlarmAudio() {
  try {
    const audio = audioContext()
    if (audio.state !== 'running') await audio.resume()
  } catch { /* Test Alarm reports unsupported/blocked audio. */ }
}

async function playDefaultSound(): Promise<boolean> {
  const audio = audioContext()
  // Never queue a delayed alarm waiting for another user gesture.
  if (audio.state !== 'running') return false
  for (let i = 0; i < 3; i++) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime + i * 0.4
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
    gain.gain.linearRampToValueAtTime(0, start + 0.28)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    oscillator.start(start)
    oscillator.stop(start + 0.3)
  }
  return true
}

type AlarmDevices = {
  sound: () => Promise<boolean>
  vibrate?: (pattern: number[]) => boolean
}
function browserDevices(): AlarmDevices {
  return {
    sound: playDefaultSound,
    vibrate: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? navigator.vibrate.bind(navigator) : undefined,
  }
}

// Keep browser output separate from completion detection. A future native build
// can schedule/cancel OS notifications at timer start/pause/reset instead.
export async function testAlarm(settings: AlarmSettings): Promise<string> {
  return playAlarm(settings, {
    ...browserDevices(),
    sound: async () => {
      await prepareAlarmAudio()
      return playDefaultSound()
    },
  })
}

export async function playAlarm(settings: AlarmSettings, devices: AlarmDevices = browserDevices()): Promise<string> {
  const messages: string[] = []
  // Request vibration before awaiting audio, preserving user activation.
  if (!settings.vibration) messages.push('Vibration off.')
  else if (!devices.vibrate) messages.push('Vibration unsupported on this browser.')
  else {
    try {
      messages.push(devices.vibrate([200, 100, 200, 100, 400])
        ? 'Vibration requested; confirm you felt it.' : 'Vibration blocked by this device/browser.')
    } catch { messages.push('Vibration unavailable.') }
  }
  if (!settings.sound) messages.push('Alarm sound off.')
  else {
    try {
      messages.push(await devices.sound()
        ? 'Sound played; confirm you heard it and check device volume.'
        : 'Sound blocked. Tap Test Alarm to enable audio.')
    } catch { messages.push('Sound unavailable on this device/browser.') }
  }
  return messages.join(' ')
}
