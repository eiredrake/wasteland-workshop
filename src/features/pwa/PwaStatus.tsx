import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import InformationPanel from '../../components/InformationPanel/InformationPanel'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export default function PwaStatus() {
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches)
 const [install,setInstall]=useState<InstallPrompt>()
 const [error,setError]=useState('')
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
 return <aside className="pwa-status" aria-label="App installation and updates">
 {update&&<InformationPanel title="Update available" tone="gold"><p>The new version is downloaded. Finish any open edits, then reload to update. Your saved data and timers are kept.</p><button type="button" className="primary-button" onClick={()=>void updateServiceWorker(true)}>Update and reload</button></InformationPanel>}
 <details><summary>Install app and offline status</summary><InformationPanel title="Wasteland Workshop on this device" tone="neutral">
 <p role="status">{ready?'Ready for offline use.':error||'Preparing offline use. Keep this page open while the app downloads.'}</p>
 {error&&<button type="button" className="secondary-button" onClick={()=>window.location.reload()}>Retry offline setup</button>}
 {installed?<p>Running as an installed app.</p>:<><p>Install from your browser to launch Workshop from your home screen or desktop.</p>{install&&<button type="button" className="primary-button" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(undefined)}}>Install Workshop</button>}<p>iPhone / iPad: open in Safari, choose Share, then Add to Home Screen and Open as Web App. Android: use Install app or Add to Home screen in your browser menu. Desktop: use the browser’s Install app option.</p></>}
 <p>Installation needs one complete online download. Offline use includes catalogs and image scanning. Opening external websites and receiving updates need a connection. Browser storage can be cleared by device settings; keep an exported backup of important data.</p>
 </InformationPanel></details></aside>
}
