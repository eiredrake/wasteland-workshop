import {afterEach,expect,it,vi} from 'vitest'
import {requestFocus,requestFocusAt} from './ScanFocus'
function track(modes:string[]){return {getCapabilities:()=>({focusMode:modes,focusDistance:{min:0,max:10}}),getSettings:()=>({focusMode:'continuous',focusDistance:2}),getConstraints:()=>({width:800}),applyConstraints:vi.fn().mockResolvedValue(undefined)} }
it('records supported and actual focus settings',async()=>{const t=track(['continuous','single-shot']);expect(await requestFocus(t as unknown as MediaStreamTrack)).toMatchObject({result:'applied',actualMode:'continuous',actualDistance:2});expect(t.applyConstraints).toHaveBeenCalledWith({width:800,focusMode:'continuous'})})
it('prefers single-shot for explicit refocus',async()=>{expect((await requestFocus(track(['continuous','single-shot']) as unknown as MediaStreamTrack,true)).requestedMode).toBe('single-shot')})
it('reapplies continuous when single-shot is unavailable',async()=>{expect((await requestFocus(track(['continuous']) as unknown as MediaStreamTrack,true)).requestedMode).toBe('continuous')})
it('leaves unsupported and manual-only cameras alone',async()=>{for(const modes of [[],['manual']]){const t=track(modes);expect((await requestFocus(t as unknown as MediaStreamTrack)).result).toBe('unsupported');expect(t.applyConstraints).not.toHaveBeenCalled()}})
it('records rejected requests without interrupting scanning',async()=>{const t=track(['continuous']);t.applyConstraints.mockRejectedValue(Error('Not supported'));expect(await requestFocus(t as unknown as MediaStreamTrack)).toMatchObject({result:'failed',error:'Not supported'})})
it('records capability reporting failure',async()=>{const t=track([]);t.getCapabilities=()=>{throw Error('Unavailable')};expect(await requestFocus(t as unknown as MediaStreamTrack)).toMatchObject({result:'unsupported',capabilityError:'Unavailable'})})

afterEach(()=>vi.unstubAllGlobals())
it('requests the tapped point and confirms the actual point when exposed',async()=>{
 vi.stubGlobal('navigator',{mediaDevices:{getSupportedConstraints:()=>({pointsOfInterest:true})}})
 const t=track(['single-shot']);t.getSettings=()=>({focusMode:'single-shot',focusDistance:2,pointsOfInterest:[{x:.2,y:.7}]})
 expect(await requestFocusAt(t as unknown as MediaStreamTrack,{x:.2,y:.7})).toMatchObject({pointResult:'applied'})
 expect(t.applyConstraints).toHaveBeenCalledWith({width:800,advanced:[{focusMode:'single-shot',pointsOfInterest:[{x:.2,y:.7}]}]})
})
it('uses autofocus when point focus is unsupported without pretending to focus a spot',async()=>{
 vi.stubGlobal('navigator',{mediaDevices:{getSupportedConstraints:()=>({})}})
 expect(await requestFocusAt(track(['continuous']) as unknown as MediaStreamTrack,{x:.1,y:.3})).toMatchObject({pointResult:'unsupported',result:'applied'})
})
it('reports a point request as unconfirmed when the device does not expose its actual point',async()=>{
 vi.stubGlobal('navigator',{mediaDevices:{getSupportedConstraints:()=>({pointsOfInterest:true})}})
 expect(await requestFocusAt(track(['continuous']) as unknown as MediaStreamTrack,{x:.1,y:.3})).toMatchObject({pointResult:'unconfirmed'})
})
