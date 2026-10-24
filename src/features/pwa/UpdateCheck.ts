type UpdateRegistration = Pick<ServiceWorkerRegistration, 'update' | 'installing' | 'waiting'>

// A failed fetch is not evidence that the installed app is up to date.
// Keep browser diagnostics/URLs out of user-facing status messages.
export async function checkAppUpdate(registration: UpdateRegistration | undefined, online: boolean): Promise<string> {
  if (!online) return 'Connect to the internet to check for updates. You can keep using the current version offline.'
  if (!registration) return 'App setup is still finishing. Keep this screen open and try again shortly.'
  try {
    await registration.update()
    const worker = registration.installing
    if (worker) await new Promise<void>((resolve, reject) => {
      const changed = () => {
        if (worker.state === 'installed' || worker.state === 'activated') { worker.removeEventListener('statechange', changed); resolve() }
        else if (worker.state === 'redundant') { worker.removeEventListener('statechange', changed); reject(new Error('Update download failed')) }
      }
      worker.addEventListener('statechange', changed)
      changed()
    })
    return registration.waiting ? '' : 'No new update is available.'
  } catch {
    return 'Unable to check for updates right now. The update service may be unavailable. Try again later. Your current app and saved data are kept.'
  }
}
