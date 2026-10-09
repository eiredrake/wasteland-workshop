import { useEffect, useId, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { WORKSHOP_URL, copyWorkshopLink, shareWorkshop, supportsAppSharing } from '../../sharing/AppSharing'
import './AppShare.css'

export default function AppShare({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [manualCopy, setManualCopy] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    element?.showModal()
    closeButton.current?.focus()
    return () => { element?.close(); previous?.focus() }
  }, [])
  async function act(action: 'copy' | 'share') {
    if (pending.current) return
    pending.current = true
    setBusy(true); setMessage(''); setError('')
    try {
      if (action === 'copy') { await copyWorkshopLink(); setMessage('Link copied!'); setManualCopy(false) }
      else await shareWorkshop()
    } catch {
      if (action === 'copy') { setManualCopy(true); setError('Could not copy the link. Select the URL below and copy it manually.') }
      else setError('Your device could not share the link. Try Copy Link instead.')
    } finally { pending.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className="app-share" aria-labelledby={titleId} onCancel={onClose}>
    <h2 id={titleId}>Wasteland Workshop</h2>
    <p>Scan to open Wasteland Workshop</p>
    <QRCodeSVG className="app-share-qr" value={WORKSHOP_URL} size={320} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" role="img" title={`QR code linking to ${WORKSHOP_URL}`} aria-label={`QR code linking to ${WORKSHOP_URL}`} />
    <p className="app-share-url"><a href={WORKSHOP_URL}>workshop.foundationsrpg.org</a></p>
    <p className="app-share-hint">The code works offline. The other player needs internet access to open the website unless it is already available on their device.</p>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    {manualCopy && <label className="app-share-manual">Website link<input aria-label="Website link" readOnly value={WORKSHOP_URL} onFocus={event => event.currentTarget.select()} /></label>}
    <div className="app-share-actions">
      <button type="button" className="primary-button" disabled={busy} onClick={() => void act('copy')}>Copy Link</button>
      {supportsAppSharing() && <button type="button" className="secondary-button" disabled={busy} onClick={() => void act('share')}>Share</button>}
      <button type="button" className="secondary-button" ref={closeButton} autoFocus onClick={onClose}>Close</button>
    </div>
  </dialog>
}
