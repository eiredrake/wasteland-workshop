import { useState } from 'react'
import './EconomicsSettingsView.css'
import { DEFAULT_EXPIRATION_WARNING_DAYS, validWarningDays } from './WarehouseSettings'
export default function WarehouseSettingsView({days,onSave}:{days:number;onSave:(days:number)=>boolean}) {
  const [draft,setDraft]=useState(String(days)), valid=draft.trim()!==''&&validWarningDays(Number(draft))
  return <section className="settings-page economics-settings-page"><h2>Warehouse Expiration</h2><form onSubmit={event=>{event.preventDefault();if(valid)onSave(Number(draft))}}>
    <div className="settings-row"><label htmlFor="expiration-warning-days">Warn before expiration (days)</label><div className="settings-input economics-override-input"><input id="expiration-warning-days" type="number" min="0" max="3650" step="1" inputMode="numeric" value={draft} aria-invalid={!valid} onChange={event=>setDraft(event.target.value)} /></div></div>
    <p>Items turn yellow when their expiration date is this many days away or closer. Expiration dates are valid through the listed day. Default: {DEFAULT_EXPIRATION_WARNING_DAYS} days.</p>
    {!valid&&<p role="alert">Enter whole days from 0 to 3650.</p>}<button type="submit" className="primary-button" disabled={!valid}>Save Expiration Settings</button>
  </form></section>
}
