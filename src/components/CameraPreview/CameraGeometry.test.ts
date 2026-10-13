import {expect,it} from 'vitest'
import {cameraFocusPoint} from './CameraGeometry'
it('maps taps through the cropped preview into full camera coordinates',()=>{
 expect(cameraFocusPoint(800,600,800,200,400,100)).toEqual({x:.5,y:.5})
 expect(cameraFocusPoint(800,600,800,200,0,0)).toEqual({x:0,y:1/3})
 expect(cameraFocusPoint(1000,500,1000,500,100,100)).toEqual({x:.1,y:.2})
})
