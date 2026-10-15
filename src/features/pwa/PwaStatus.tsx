import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import InformationPanel from '../../components/InformationPanel/InformationPanel'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export default function PwaStatus({visible}:{visible:boolean}) {
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches)
 const [install,setInstall]=useState<InstallPrompt>()
 const [error,setError]=useState('')
 const [checking,setChecking]=useState(false)
 const [checkMessage,setCheckMessage]=useState('')
 const registration=useRef<ServiceWorkerRegistration>(undefined)
 const {offlineReady:[ready,setReady],needRefresh:[update],updateServiceWorker}=useRegisterSW({immediate:true,
  onRegisteredSW(_url,value){registration.current=value;if(value?.active)setReady(true)
   const watch=()=>{const worker=value?.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='redundant'&&!value?.active)setError('Offline setup could not finish. Reconnect and reload to retry. Existing data is kept.')})}
   watch();value?.addEventListener('updatefound',watch)},
  onRegisterError(){if(!navigator.serviceWorker?.controller)setError('Offline setup could not finish. Reconnect and reload to retry. Existing data is kept.')},
 })
 useEffect(()=>{
  let mounted=true
  const controlled=()=>{if(navigator.serviceWorker?.controller){setReady(true);setError('')}}
  controlled()
  if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',controlled);void navigator.serviceWorker.ready.then(()=>{if(mounted)setReady(true)})}
  const check=()=>{if(navigator.onLine&&document.visibilityState==='visible')void registration.current?.update().catch(()=>{/* Keep using the installed version. */})}
  const prompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallPrompt)}
  const done=()=>{setInstalled(true);setInstall(undefined)}
  window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',done)
  window.addEventListener('online',check);document.addEventListener('visibilitychange',check)
  const timer=window.setInterval(check,60*60*1000)
  return ()=>{mounted=false;navigator.serviceWorker?.removeEventListener('controllerchange',controlled);clearInterval(timer);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',done);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check)}
 },[setReady])
 async function checkForUpdates(){
  setChecking(true);setCheckMessage('')
  try{
   const value=registration.current
   if(!navigator.onLine)throw new Error('Connect to the internet to check for updates. You can keep using the current version offline.')
   if(!value)throw new Error('App setup is still finishing. Keep this screen open and try again shortly.')
   await value.update()
   const worker=value.installing
   if(worker)await new Promise<void>((resolve,reject)=>{const changed=()=>{if(worker.state==='installed'||worker.state==='activated'){worker.removeEventListener('statechange',changed);resolve()}else if(worker.state==='redundant'){worker.removeEventListener('statechange',changed);reject(new Error('The update could not be downloaded. Your current version is still available.'))}};worker.addEventListener('statechange',changed);changed()})
   if(!value.waiting)setCheckMessage('No new update is available.')
  }catch(reason){setCheckMessage(reason instanceof Error?reason.message:'Unable to check for updates. Try again when connected.')}
  finally{setChecking(false)}
 }
 if(!visible)return null
 return <section className="settings-page pwa-status" aria-label="App installation and updates"><h2>Update app</h2>
 <InformationPanel title="Keep Workshop up to date" tone="gold"><p>Workshop downloads new versions when you are connected. Your current version remains available offline while an update downloads.</p><p>When an update is ready, save any open edits, then choose Update and reload. This restarts the app with the downloaded version. Your saved collections, inventory, work history, and timers are kept.</p>
 {update?<><p role="status">An update is downloaded and ready to install.</p><button type="button" className="primary-button" onClick={()=>void updateServiceWorker(true)}>Update and reload</button></>:<p>No downloaded update is waiting.</p>}
 <p><button type="button" className="secondary-button" disabled={checking} onClick={()=>void checkForUpdates()}>Check for updates</button></p>
 {(checking||checkMessage)&&<p role="status">{checking?'Checking for updates…':checkMessage}</p>}
 </InformationPanel>
 <details><summary>Install app and offline status</summary><InformationPanel title="Wasteland Workshop on this device" tone="neutral">
 <p role="status">{ready?'Ready for offline use.':error||'Preparing offline use. Keep this page open while the app downloads.'}</p>
 {error&&<button type="button" className="secondary-button" onClick={()=>window.location.reload()}>Retry offline setup</button>}
 {installed?<p>Running as an installed app.</p>:<><p>Install from your browser to launch Workshop from your home screen or desktop.</p>{install&&<button type="button" className="primary-button" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(undefined)}}>Install Workshop</button>}<p>iPhone / iPad: open in Safari, choose Share, then Add to Home Screen and Open as Web App. Android: use Install app or Add to home screen in your browser menu. Desktop: use the browser’s Install app option.</p></>}
 <p>Installation needs one complete online download. Offline use includes catalogs and image scanning. Opening external websites and receiving updates need a connection. Browser storage can be cleared by device settings; keep an exported backup of important data.</p>
 </InformationPanel></details></section>
}
