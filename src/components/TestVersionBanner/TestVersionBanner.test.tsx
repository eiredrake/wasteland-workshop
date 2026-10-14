import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import TestVersionBanner from './TestVersionBanner'
import {isTestServer} from './TestServer'
it.each(['workshop-test.foundationsrpg.org','WORKSHOP-TEST.FOUNDATIONSRPG.ORG.'])('labels the explicitly configured test server %s',hostname=>{
 expect(isTestServer(hostname)).toBe(true);expect(renderToStaticMarkup(<TestVersionBanner hostname={hostname}/>)).toContain('TEST VERSION v0.0.0')
})
it.each(['workshop.foundationsrpg.org','localhost','127.0.0.1','workshop-test.foundationsrpg.org.example.com'])('leaves production and other servers unmarked: %s',hostname=>{
 expect(isTestServer(hostname)).toBe(false);expect(renderToStaticMarkup(<TestVersionBanner hostname={hostname}/>)).toBe('')
})
