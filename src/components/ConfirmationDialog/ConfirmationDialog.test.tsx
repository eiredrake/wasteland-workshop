import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import ConfirmationDialog from './ConfirmationDialog'
it('preserves ordinary destructive confirmation defaults',()=>{
 const html=renderToStaticMarkup(<ConfirmationDialog title="Delete record" message="Confirm deletion" onConfirm={()=>{}} onCancel={()=>{}}/>)
 expect(html).toContain('Cancel');expect(html).toContain('danger-button');expect(html).toContain('Delete');expect(html).toContain('aria-describedby')
})
it.each(['success','danger'] as const)('supports themed single-action result modal: %s',tone=>{
 const html=renderToStaticMarkup(<ConfirmationDialog title="Result" message={<span>Actual filename or error</span>} tone={tone} showCancel={false} confirmLabel="OK" onConfirm={()=>{}} onCancel={()=>{}}/>)
 expect(html).toContain('confirmation-dialog-'+tone);expect(html).toContain('Actual filename or error');expect(html).toContain('>OK</button>');expect(html).toContain('autofocus');expect(html).not.toContain('>Cancel</button>')
})
