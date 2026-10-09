import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const cssSource = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
it('the foundational focus and touch targets use defined tokens', () => {
 const css = cssSource('src/styles/controls.css')
 expect(css).toContain(':focus-visible')
 expect(css).toContain('outline:2px solid var(--color-focus)')
 expect(css).toContain('min-height:44px')
 expect(cssSource('src/styles/theme.css')).toContain('--color-accent: var(--color-rust-light)')
})
it('theme source does not reintroduce duplicate palette literals outside tokens', () => {
 for (const path of ['src/App.css', 'src/styles/controls.css', 'src/components/BackButton/BackButton.css', 'src/components/RemoveBadge/RemoveBadge.css', 'src/components/SearchInput/SearchInput.css']) {
  expect(cssSource(path)).not.toMatch(/#(?:d65f32|e37045|f0e6d2|d6a33d|c6edaf)\b/i)
 }
})
