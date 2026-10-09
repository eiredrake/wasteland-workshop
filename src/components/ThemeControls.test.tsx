import { describe,expect,it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BackButton from './BackButton/BackButton'
import RemoveBadge from './RemoveBadge/RemoveBadge'
import SearchInput from './SearchInput/SearchInput'
describe('canonical UI controls',()=>{
 it('removal variants expose action names and hide decorative X',()=>{for(const size of ['compact','standard'] as const){const html=renderToStaticMarkup(<RemoveBadge size={size} label="Delete collection Test" onClick={()=>{}}/>);expect(html).toContain('aria-label="Delete collection Test"');expect(html).toContain('aria-hidden="true"');expect(html).toContain('remove-badge-'+size)}})
 it('Back uses an arrow and explicit destination',()=>{const html=renderToStaticMarkup(<BackButton>Back to Work Queue</BackButton>);expect(html).toContain('Back to Work Queue');expect(html).toContain('aria-hidden="true"')})
 it('search has a clear control only when a query exists and respects disabled',()=>{expect(renderToStaticMarkup(<SearchInput label="Search inventory" value="" onValueChange={()=>{}}/>)).not.toContain('Clear Search inventory');const html=renderToStaticMarkup(<SearchInput label="Search inventory" value="mine" disabled onValueChange={()=>{}}/>);expect(html).toContain('aria-label="Clear Search inventory"');expect(html).toContain('disabled=""')})
})
