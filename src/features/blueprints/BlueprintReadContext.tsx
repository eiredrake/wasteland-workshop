import { masterBlueprints } from './blueprints'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { loadReadHistory, markBlueprintRead, markBlueprintsRead } from './BlueprintReadHistory'
import { BlueprintReadContext } from './useBlueprintReadHistory'
export function BlueprintReadProvider({children}:{children:ReactNode}) {
  const [initial] = useState(() => { try { return {ids:loadReadHistory(),error:''} } catch { return {ids:[],error:'Blueprint read history could not be loaded. Stored history has been kept; reload after resolving the storage problem.'} } })
  const [readIds,setReadIds] = useState(initial.ids), [error,setError] = useState(initial.error)
  const ids = useRef(initial.ids)
  const markRead = useCallback((id:number) => {
    if (initial.error || ids.current.includes(id)) return
    try { const next = markBlueprintRead(ids.current,id); ids.current=next; setReadIds(next); setError('') }
    catch { setError('Could not save Blueprint read history. Read status has not been changed. Check available storage or reload the app.') }
  },[initial.error])
  const markAllRead = useCallback(() => {
    if (initial.error) return false
    try { const next=markBlueprintsRead(ids.current,masterBlueprints.map(blueprint=>blueprint.id)); ids.current=next; setReadIds(next); setError(''); return true }
    catch { setError('Could not save Blueprint read history. Read status has not been changed. Check available storage or reload the app.'); return false }
  },[initial.error])
  return <BlueprintReadContext.Provider value={{readIds,markRead,markAllRead,historyAvailable:!initial.error}}>{error && <p role="alert">{error}</p>}{children}</BlueprintReadContext.Provider>
}
