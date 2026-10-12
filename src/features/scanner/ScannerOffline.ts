type OfflineStatus = 'online-only' | 'preparing' | 'ready' | 'unavailable'
let status:OfflineStatus='online-only'
const listeners=new Set<()=>void>()
function update(next:OfflineStatus){status=next;listeners.forEach(listener=>listener())}
export const scannerOfflineStatus=()=>status
export function subscribeScannerOffline(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export async function prepareScannerOffline(){
 if(!import.meta.env.PROD||!('serviceWorker' in navigator))return
 update('preparing')
 try{
  const expected=new URL(import.meta.env.BASE_URL+'scanner-offline.js',location.href).href
  const existing=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  if(existing?.scope===new URL(import.meta.env.BASE_URL,location.href).href){const installed=existing.active??existing.waiting??existing.installing;if(installed&&installed.scriptURL!==expected){update('unavailable');return}}
  const registration=await navigator.serviceWorker.register(import.meta.env.BASE_URL+'scanner-offline.js',{scope:import.meta.env.BASE_URL})
  const worker=registration.installing??registration.waiting??registration.active
  if(!worker){update('unavailable');return}
  const changed=()=>{if(worker.state==='activated')update('ready');else if(worker.state==='redundant')update('unavailable')}
  changed();worker.addEventListener('statechange',changed)
 }catch{update('unavailable')}
}

export async function inspectScannerOffline(){
 if(import.meta.env.PROD && 'serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);if(registration?.active?.scriptURL===new URL(import.meta.env.BASE_URL+'scanner-offline.js',location.href).href&&status==='online-only')update('ready')}
}
