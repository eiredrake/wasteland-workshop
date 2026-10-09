export const WORKSHOP_URL = 'https://workshop.foundationsrpg.org/'
export const WORKSHOP_SHARE = {
  title: 'Wasteland Workshop',
  text: 'Wasteland Workshop — a free crafting companion.',
  url: WORKSHOP_URL,
}
export function supportsAppSharing(device: Pick<Navigator, 'share' | 'canShare'> = navigator): boolean {
  return typeof device.share === 'function' && (!device.canShare || device.canShare(WORKSHOP_SHARE))
}
export async function copyWorkshopLink(device: Pick<Navigator, 'clipboard'> = navigator): Promise<void> {
  if (!device.clipboard?.writeText) throw new Error('Clipboard unavailable')
  await device.clipboard.writeText(WORKSHOP_URL)
}
export async function shareWorkshop(device: Pick<Navigator, 'share'> = navigator): Promise<'shared' | 'cancelled'> {
  try { await device.share(WORKSHOP_SHARE); return 'shared' }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
