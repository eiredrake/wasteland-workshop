import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import ScanAcquirePlaceholder from './ScanAcquirePlaceholder'
it('retains Scan & Acquire as a rebuilding placeholder without scanner controls',()=>{
 const html=renderToStaticMarkup(<ScanAcquirePlaceholder onBack={()=>{}}/>)
 for(const text of ['Scan &amp; Acquire','The scanner is being rebuilt.','Photo selection and blueprint identification are temporarily unavailable.','back-button','Back to Collections'])expect(html).toContain(text)
 for(const removed of ['type="file"','<video','<canvas','Choose Photo','Use Camera','Claim Blueprint'])expect(html).not.toContain(removed)
})
