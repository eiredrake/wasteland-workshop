import { useState } from 'react'
import type { AlarmSettings } from '../timer/AlarmSettings'
import { testAlarm } from '../timer/CraftAlarm'

export default function AlarmSettingsView({ settings, onChange }: {
  settings: AlarmSettings
  onChange: (settings: AlarmSettings) => void
}) {
  const [result, setResult] = useState('Tap Test Alarm, then confirm you hear the sound and feel vibration.')
  const [testing, setTesting] = useState(false)
  return <section className="settings-page">
    <h3>Timer Alarm</h3>
    <div className="settings-card">
      {(['sound', 'vibration'] as const).map(key => <div className="settings-row" key={key}>
        <label htmlFor={`alarm-${key}`}>{key === 'sound' ? 'Alarm Sound' : 'Vibration'}</label>
        <select id={`alarm-${key}`} value={String(settings[key])}
          onChange={event => { onChange({ ...settings, [key]: event.target.value === 'true' }); setResult('Settings changed. Tap Test Alarm to check them.') }}>
          <option value="true">On</option><option value="false">Off</option>
        </select>
      </div>)}
      <div className="settings-actions"><button className="secondary-button" type="button" disabled={testing} onClick={async () => {
        setTesting(true)
        try {
          setResult(await testAlarm(settings))
        } finally {
          setTesting(false)
        }
      }}>{testing ? 'Testing…' : 'Test Alarm'}</button></div>
      <p role="status">{result}</p>
      <p>Changes save automatically. Keep Wasteland Workshop visible and your screen awake to receive timer alarms.
        Alarms are not reliable when the phone is locked or another app is open.
        iPhone Safari does not support browser vibration.</p>
    </div>
  </section>
}
