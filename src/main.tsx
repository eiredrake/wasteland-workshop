import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeUserStorage, REVISION_KEY, withRestoreLock } from './features/backup/UserStorage'
const root=createRoot(document.getElementById('root')!)
async function start() {
try {
  await withRestoreLock(()=>initializeUserStorage())
  window.addEventListener('storage',event=>{if(event.key===REVISION_KEY)window.location.reload()})
  root.render(<StrictMode><App /></StrictMode>)
} catch(error) {
  root.render(<main><h1>Data recovery required</h1><p>{error instanceof Error?error.message:'Stored data could not be accessed.'}</p><p>Your stored data has been kept. Close other app tabs and reload to retry recovery.</p><button onClick={()=>window.location.reload()}>Retry Recovery</button></main>)
}

}
void start()
