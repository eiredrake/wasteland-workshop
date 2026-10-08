import { afterEach, describe, expect, it, vi } from 'vitest'
import { layoutCard, renderShareCard, wrapText } from './ShareCard'
import { canCopyImage, canShareImage, copyImage, imageFilename, saveImage, shareImage } from './ImageActions'
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
const blob = new Blob(['png'], { type: 'image/png' })
const file = new File([blob], 'Blueprint.png', { type: 'image/png' })
describe('share card renderer', () => {
  it('preserves paragraphs and wraps long words without clipping or truncation', () => {
    const text = 'a'.repeat(200) + '\n\nSecond paragraph'
    const lines = wrapText(text, s => s.length, 20)
    expect(lines.every(line => line.length <= 20)).toBe(true)
    expect(lines.join('').replaceAll(' ', '')).toBe(text.replace(/\s/g, ''))
    expect(lines).toContain('')
  })
  it('uses fixed width and grows for long content independently of viewport', () => {
    const context = { font: '', measureText: (text: string) => ({ width: text.length * 15 }) }
    const card = { title: 'Long name '.repeat(20), sections: [{ label: 'Mechanics', text: 'word '.repeat(700) }], footer: 'Footer' }
    vi.stubGlobal('innerWidth', 320)
    const small = layoutCard(card, context)
    vi.stubGlobal('innerWidth', 1920)
    expect(layoutCard(card, context)).toEqual(small)
    expect(small.width).toBe(900)
    expect(small.height).toBeGreaterThan(2000)
    expect(small.lines.filter(line => line.font === '28px Arial').map(line => line.text).join(' ').trim()).toBe(card.sections[0].text.trim())
  })
  it('renders opaque background and PNG, and reports encoding failures', async () => {
    const context = { font: '', measureText: (s: string) => ({ width: s.length * 10 }), fillStyle: '', textBaseline: '', fillRect: vi.fn(), fillText: vi.fn() }
    const canvas = { width: 0, height: 0, getContext: () => context, toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(blob)) }
    vi.stubGlobal('document', { createElement: () => canvas })
    const card = { title: 'Name', sections: [], footer: '' }
    expect(await renderShareCard(card)).toBe(blob)
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 900, canvas.height)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
    canvas.toBlob.mockImplementation(cb => cb(null))
    await expect(renderShareCard(card)).rejects.toThrow('encode')
  })
  it('reports unavailable canvas', async () => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) })
    await expect(renderShareCard({title:'Name',sections:[],footer:''})).rejects.toThrow('create')
  })
})
describe('image delivery', () => {
  it('shares the actual file only when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: vi.fn().mockReturnValue(true) })
    expect(canShareImage(file)).toBe(true)
    expect(await shareImage(file)).toBe('opened')
    expect(share).toHaveBeenCalledWith({ files: [file] })
  })
  it('handles unsupported capability and capability errors', () => {
    vi.stubGlobal('navigator', {})
    expect(canShareImage(file)).toBe(false)
    expect(canCopyImage()).toBe(false)
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => { throw new Error() } })
    expect(canShareImage(file)).toBe(false)
  })
  it('treats cancellation quietly but propagates real errors', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('Cancel', 'AbortError')) })
    expect(await shareImage(file)).toBe('cancelled')
    navigator.share = vi.fn().mockRejectedValue(new Error('Denied'))
    await expect(shareImage(file)).rejects.toThrow('Denied')
  })
  it('copies the generated PNG and waits for clipboard completion', async () => {
    let finish!: () => void
    const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    class Item { static supports() { return true }; data: Record<string, Blob>; constructor(data: Record<string, Blob>) { this.data = data } }
    vi.stubGlobal('ClipboardItem', Item)
    vi.stubGlobal('navigator', { clipboard: { write } })
    expect(canCopyImage()).toBe(true)
    let done = false
    const pending = copyImage(blob).then(() => { done = true })
    expect(write.mock.calls[0]).toEqual([expect.arrayContaining([expect.objectContaining({ data: { 'image/png': blob } })])])
    expect(done).toBe(false)
    finish(); await pending; expect(done).toBe(true)
    write.mockImplementation(() => Promise.reject(new Error('Permission denied')))
    await expect(copyImage(blob)).rejects.toThrow('Permission denied')
  })
  it('downloads the PNG and releases its object URL', () => {
    vi.useFakeTimers()
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const append = vi.fn(), revoke = vi.fn()
    vi.stubGlobal('document', { createElement: () => link, body: { append } })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:image'), revokeObjectURL: revoke })
    saveImage(blob, 'Name.png')
    expect(link.href).toBe('blob:image'); expect(link.download).toBe('Name.png')
    expect(append).toHaveBeenCalledWith(link); expect(link.click).toHaveBeenCalledOnce()
    expect(link.remove).toHaveBeenCalledOnce()
    vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith('blob:image')
  })
  it.each([['Sagely Healing Injection', 'Sagely-Healing-Injection.png'], ['../Bad:<Name>/?*', 'Bad-Name.png'], ['CON','Blueprint.png'], ['', 'Blueprint.png']])('sanitizes %s', (input, output) => expect(imageFilename(input)).toBe(output))
})
