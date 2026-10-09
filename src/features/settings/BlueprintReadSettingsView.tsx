import { useState } from 'react'
import { masterBlueprints } from '../blueprints/blueprints'
import { useBlueprintReadHistory } from '../blueprints/useBlueprintReadHistory'
export default function BlueprintReadSettingsView() {
  const {readIds,markAllRead,historyAvailable} = useBlueprintReadHistory()
  const [message,setMessage] = useState('')
  const read = new Set(readIds), unread=masterBlueprints.filter(blueprint=>!read.has(blueprint.id)).length
  return <section className="settings-page"><div className="settings-card">
    <h3>Blueprint Read Status</h3>
    <p>{unread} unread blueprints in the current Master Catalog.</p>
    <p>Mark them all read across the Master Catalog and your collections. Blueprints added to the catalog later will still start unread.</p>
    <button type="button" className="primary-button" disabled={!unread || !markAllRead || historyAvailable===false} onClick={()=>{if(markAllRead?.())setMessage('All current blueprints marked read.')}}>Mark All Blueprints Read</button>
    {!unread && <p>All current blueprints are read.</p>}
    {message && <p role="status">{message}</p>}
  </div></section>
}
