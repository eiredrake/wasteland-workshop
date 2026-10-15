import {afterEach,expect,it,vi} from 'vitest'
import {saveExportFile} from './SaveFile'
const file={name:'history.json',mimeType:'application/json',extension:'json',content:'{"activities":[]}'}
afterEach(()=>vi.unstubAllGlobals())
it('opens a typed save picker immediately and waits for write and close',async()=>{
 let release:()=>void=()=>{}
 const write=vi.fn(()=>new Promise<void>(resolve=>{release=resolve})),close=vi.fn(async()=>{}),abort=vi.fn(async()=>{})
 const picker=vi.fn(async()=>({createWritable:async()=>({write,close,abort})}))
 vi.stubGlobal('window',{showSaveFilePicker:picker})
 const saving=saveExportFile(file);expect(picker).toHaveBeenCalledWith({suggestedName:file.name,excludeAcceptAllOption:true,types:[{description:'JSON file',accept:{'application/json':['.json']}}]})
 await vi.waitFor(()=>expect(write).toHaveBeenCalledOnce());expect(close).not.toHaveBeenCalled()
 expect(await (write.mock.calls[0] as unknown as [Blob])[0].text()).toBe(file.content)
 release();expect(await saving).toBe('saved');expect(close).toHaveBeenCalledOnce()
})
it('cancelling the picker does not write or download',async()=>{
 vi.stubGlobal('window',{showSaveFilePicker:async()=>{throw new DOMException('Cancelled','AbortError')}})
 expect(await saveExportFile(file)).toBe('cancelled')
})
it('write failures abort and remain errors rather than reporting success',async()=>{
 const abort=vi.fn(async()=>{}),close=vi.fn(async()=>{})
 vi.stubGlobal('window',{showSaveFilePicker:async()=>({createWritable:async()=>({write:async()=>{throw Error('Disk full')},close,abort})})})
 await expect(saveExportFile(file)).rejects.toThrow('Disk full');expect(abort).toHaveBeenCalledOnce();expect(close).not.toHaveBeenCalled()
})
it('file-opening failures are not mistaken for picker cancellation',async()=>{
 vi.stubGlobal('window',{showSaveFilePicker:async()=>({createWritable:async()=>{throw new DOMException('Open failed','AbortError')}})})
 await expect(saveExportFile(file)).rejects.toThrow('Open failed')
})
