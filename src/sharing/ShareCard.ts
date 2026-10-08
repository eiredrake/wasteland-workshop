export type ShareCard = { title: string; sections: { label: string; text: string }[]; footer: string }
export const CARD_WIDTH = 900
const MARGIN = 48
export function wrapText(text: string, measure: (text: string) => number, width: number): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n').flatMap(paragraph => {
    if (!paragraph) return ['']
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if (line && measure(line + ' ' + word) <= width) { line += ' ' + word; continue }
      if (line) { lines.push(line); line = '' }
      for (const character of Array.from(word)) {
        if (line && measure(line + character) > width) { lines.push(line); line = '' }
        line += character
      }
    }
    if (line) lines.push(line)
    return lines
  })
}
export function layoutCard(card: ShareCard, context: { font: string; measureText: (text: string) => { width: number } }) {
  let y = 48
  const lines: { text: string; y: number; font: string; color: string }[] = []
  const add = (text: string, font: string, color: string, height: number) => {
    context.font = font
    for (const line of wrapText(text, value => context.measureText(value).width, CARD_WIDTH - MARGIN * 2)) {
      lines.push({ text: line, y, font, color }); y += height
    }
  }
  add('WASTELAND WORKSHOP', 'bold 24px Arial', '#e88450', 34)
  y += 18
  add(card.title, 'bold 38px Arial', '#ffffff', 48)
  y += 30
  for (const section of card.sections) {
    add(section.label.toUpperCase(), 'bold 22px Arial', '#edc96c', 32)
    add(section.text, '28px Arial', '#f1f0e8', 38)
    y += 26
  }
  add(card.footer, '20px Arial', '#b7b5aa', 28)
  return { width: CARD_WIDTH, height: Math.ceil(y + MARGIN), lines }
}
export async function renderShareCard(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create the image. Try another browser.')
  const layout = layoutCard(card, context)
  if (layout.height > 16000) throw new Error('This blueprint is too long for a single image on this device.')
  canvas.width = layout.width; canvas.height = layout.height
  context.fillStyle = '#171715'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#b95730'; context.fillRect(0, 0, 8, canvas.height)
  context.textBaseline = 'top'
  for (const line of layout.lines) {
    context.font = line.font; context.fillStyle = line.color; context.fillText(line.text, MARGIN, line.y)
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not encode the PNG. Try another browser.')), 'image/png'))
}
