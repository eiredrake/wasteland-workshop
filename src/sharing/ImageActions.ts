export function imageFilename(name: string) {
  const safe = Array.from(name.normalize('NFKC')).filter(character => character.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[. -]+|[. -]+$/g, '').slice(0, 120)
  return `${safe && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe) ? safe : 'Blueprint'}.png`
}
export function canShareImage(file: File) {
  try { return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) } catch { return false }
}
export async function shareImage(file: File): Promise<'opened' | 'cancelled'> {
  try { await navigator.share({ files: [file] }); return 'opened' }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; throw error }
}
export function canCopyImage() {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function' && (!ClipboardItem.supports || ClipboardItem.supports('image/png'))
}
export async function copyImage(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
export function saveImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try { link.href = url; link.download = filename; document.body.append(link); link.click() }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000) }
}
