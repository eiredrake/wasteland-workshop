import {describe,it,expect,vi} from 'vitest'
import {checkAppUpdate} from './UpdateCheck'

describe('manual app update checks',()=>{
 const registration=()=>({update:vi.fn().mockResolvedValue(undefined),installing:null,waiting:null})
 it('reports no update only after a successful check',async()=>{
  const value=registration()
  expect(await checkAppUpdate(value,true)).toBe('No new update is available.')
  expect(value.update).toHaveBeenCalledOnce()
 })
 it.each([new TypeError('Failed to update a ServiceWorker: HTTP 530 https://example.com/service-worker.js'),new Error('Network disconnected'),'unknown failure'])('shows a readable retry message for failed checks',async error=>{
  const value=registration();value.update.mockRejectedValue(error)
  const result=await checkAppUpdate(value,true)
  expect(result).toContain('Unable to check for updates')
  expect(result).toContain('saved data are kept')
  expect(result).not.toMatch(/https:|ServiceWorker|530|No new update/)
  value.update.mockResolvedValue(undefined)
  expect(await checkAppUpdate(value,true)).toBe('No new update is available.')
 })
 it('does not request an update while offline or before setup',async()=>{
  const value=registration()
  expect(await checkAppUpdate(value,false)).toContain('Connect to the internet')
  expect(value.update).not.toHaveBeenCalled()
  expect(await checkAppUpdate(undefined,true)).toContain('setup is still finishing')
 })
 it('does not claim there is no update when one is waiting',async()=>{
  expect(await checkAppUpdate({...registration(),waiting:{} as ServiceWorker},true)).toBe('')
 })
 it('waits for a download and handles a failed installation',async()=>{
  const worker=Object.assign(new EventTarget(),{state:'installing'})
  const value={...registration(),installing:worker as ServiceWorker}
  const result=checkAppUpdate(value,true)
  await Promise.resolve()
  worker.state='redundant';worker.dispatchEvent(new Event('statechange'))
  expect(await result).toContain('Unable to check for updates')
 })
})
