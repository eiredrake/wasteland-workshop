import { describe, expect, it, vi } from 'vitest'
import { WORKSHOP_URL, WORKSHOP_SHARE, copyWorkshopLink, shareWorkshop, supportsAppSharing } from './AppSharing'
describe('app sharing', () => {
  it('uses the exact production URL', () => { expect(WORKSHOP_URL).toBe('https://workshop.foundationsrpg.org/'); expect(WORKSHOP_SHARE.url).toBe(WORKSHOP_URL) })
  it('copies only after clipboard succeeds', async () => { const writeText = vi.fn().mockResolvedValue(undefined); await copyWorkshopLink({ clipboard: { writeText } } as unknown as Navigator); expect(writeText).toHaveBeenCalledWith(WORKSHOP_URL) })
  it('propagates clipboard failure and unsupported clipboard', async () => { await expect(copyWorkshopLink({} as Navigator)).rejects.toThrow(); await expect(copyWorkshopLink({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } } as unknown as Navigator)).rejects.toThrow('Denied') })
  it('hides unsupported sharing', () => { expect(supportsAppSharing({} as Navigator)).toBe(false); expect(supportsAppSharing({ share: vi.fn(), canShare: () => false } as unknown as Navigator)).toBe(false); expect(supportsAppSharing({ share: vi.fn() } as unknown as Navigator)).toBe(true) })
  it('shares the canonical content', async () => { const share = vi.fn().mockResolvedValue(undefined); expect(await shareWorkshop({ share })).toBe('shared'); expect(share).toHaveBeenCalledWith(WORKSHOP_SHARE) })
  it('treats cancellation quietly and propagates other errors', async () => { expect(await shareWorkshop({ share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) })).toBe('cancelled'); await expect(shareWorkshop({ share: vi.fn().mockRejectedValue(new Error('Denied')) })).rejects.toThrow('Denied') })
})
