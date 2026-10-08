import { useEffect, useId, useRef, useState } from 'react'
import { renderShareCard, type ShareCard } from '../../sharing/ShareCard'
import { canCopyImage, canShareImage, copyImage, imageFilename, saveImage, shareImage } from '../../sharing/ImageActions'
import './SharePreview.css'
type Generated = { blob: Blob; file: File; url: string }
export default function SharePreview({ card, onClose }: { card: ShareCard; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [generated, setGenerated] = useState<Generated>()
  const [message, setMessage] = useState('Preparing image…')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    let disposed = false, url: string | undefined
    renderShareCard(card).then(blob => {
      if (disposed) return
      url = URL.createObjectURL(blob)
      setGenerated({ blob, file: new File([blob], imageFilename(card.title), { type: 'image/png' }), url })
      setMessage('Preview your image, then choose how to share it.')
    }).catch(error => { if (!disposed) setMessage(error instanceof Error ? error.message : 'Image generation failed. Please try again.') })
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); element?.close() }
  }, [card])
  const act = async (action: 'share' | 'copy' | 'save') => {
    if (!generated || busy) return
    setBusy(true)
    try {
      if (action === 'share') setMessage(await shareImage(generated.file) === 'cancelled' ? 'Sharing cancelled.' : 'Share request handed to your device.')
      if (action === 'copy') { await copyImage(generated.blob); setMessage('Image copied. Paste it into your message.') }
      if (action === 'save') { saveImage(generated.blob, generated.file.name); setMessage('Image download started. Check your downloads.') }
    } catch { setMessage(action === 'copy' ? 'Could not copy the image. Clipboard access may be blocked. Use Save Image instead.' : action === 'share' ? 'Your device could not share the image. Use Save Image instead.' : 'Could not start the download. Please try again.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="share-preview" aria-labelledby={titleId} onCancel={onClose}>
    <h2 id={titleId}>Share Print</h2>
    <div className="share-preview-image">{generated && <img src={generated.url} alt={`${card.title} share print`} />}</div>
    <p role="status">{message}</p>
    {generated && <p className="share-preview-hint">{!canShareImage(generated.file) && 'Image sharing is unavailable here. '}{!canCopyImage() && 'Image clipboard is unavailable here. '}Save Image lets you attach the PNG yourself.</p>}
    <div className="share-preview-actions">
      <button type="button" disabled={!generated || busy || !canShareImage(generated.file)} onClick={() => void act('share')}>Share</button>
      <button type="button" disabled={!generated || busy || !canCopyImage()} onClick={() => void act('copy')}>Copy Image</button>
      <button type="button" disabled={!generated || busy} onClick={() => void act('save')}>Save Image</button>
      <button type="button" autoFocus onClick={onClose}>Close</button>
    </div>
  </dialog>
}
