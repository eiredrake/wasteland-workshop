import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import InformationPanel from '../../components/InformationPanel/InformationPanel'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export default function PwaStatus({screen}:{screen?:'install'|'update'}) {
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true)
 const [installMessage,setInstallMessage]=useState('')
 const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
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
  const mode=window.matchMedia('(display-mode: standalone)')
  const modeChanged=()=>setInstalled(mode.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true)
  mode.addEventListener('change',modeChanged)
  const done=()=>{setInstalled(true);setInstall(undefined);setInstallMessage('')}
  window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',done)
  window.addEventListener('online',check);document.addEventListener('visibilitychange',check)
  const timer=window.setInterval(check,60*60*1000)
  return ()=>{mode.removeEventListener('change',modeChanged);mounted=false;navigator.serviceWorker?.removeEventListener('controllerchange',controlled);clearInterval(timer);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',done);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check)}
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
 async function installApp(){
  if(!install)return
  const request=install;setInstall(undefined);setInstallMessage('')
  try{await request.prompt();const choice=await request.userChoice;setInstallMessage(choice.outcome==='accepted'?'Installation requested. Follow the browser confirmation, then open Workshop from its new icon.':'Installation canceled. You can still use Workshop in your browser or install later from its menu.')}
  catch{setInstallMessage('The browser could not open installation. Use its Install app or Add to home screen menu option instead.')}
 }
 if(!screen)return null
 const offlineStatus=<InformationPanel title="Offline status" tone="neutral"><p role="status">{import.meta.env.DEV?'Offline installation and updates are available in the deployed application.':ready?'Ready for offline use.':error||'Preparing offline use. Keep this page open while the app downloads.'}</p>{error&&<button type="button" className="secondary-button" onClick={()=>window.location.reload()}>Retry offline setup</button>}<p>The first download needs an internet connection. Once ready, Workshop can open and work offline. Updates and external websites need a connection.</p></InformationPanel>
 return <section className="settings-page pwa-status" aria-label={screen==='install'?'App installation':'App updates'}><h2>{screen==='install'?'Install app':'Update app'}</h2>
 {screen==='install'?<InformationPanel title="Install Wasteland Workshop" tone="gold">
 {installed?<p role="status">Already installed. Open Workshop from its home-screen or desktop icon.</p>:<><p>Add Workshop to your home screen or desktop so you can open it like an app. You can also keep using it in your browser.</p>
 {install?<button type="button" className="primary-button" onClick={()=>void installApp()}>Install Workshop</button>:apple?<><p>On iPhone or iPad:</p><ol><li>Open Workshop in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Enable Open as Web App if shown, then tap Add.</li></ol></>:<><p>If an Install Workshop button is available, it opens your browser’s installation confirmation.</p><p>Otherwise, on Windows use Chrome or Edge and choose Install app from the browser menu. On Android choose Install app or Add to home screen, then Install.</p><p>If you already installed Workshop, open it from its existing icon.</p></>}
 {installMessage&&<p role="status">{installMessage}</p>}</>}
 </InformationPanel>:<InformationPanel title="Keep Workshop up to date" tone="gold"><p>Workshop downloads new versions when you are connected. Your current version remains available offline while an update downloads.</p><p>When an update is ready, save any open edits, then choose Update and reload. This restarts the app with the downloaded version. Your saved collections, inventory, work history, and timers are kept.</p>
 {update?<><p role="status">An update is downloaded and ready to install.</p><button type="button" className="primary-button" onClick={()=>void updateServiceWorker(true)}>Update and reload</button></>:<p>No downloaded update is waiting.</p>}
 <p><button type="button" className="secondary-button" disabled={checking||import.meta.env.DEV} onClick={()=>void checkForUpdates()}>Check for updates</button></p>
 {(checking||checkMessage)&&<p role="status">{checking?'Checking for updates…':checkMessage}</p>}
 </InformationPanel>}
 {offlineStatus}</section>
}
