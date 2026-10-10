import {expect,it} from 'vitest'
import {advanceAutoCapture} from './ScanAutoCapture'
import {masterBlueprints} from '../blueprints/blueprints'
const blueprint=masterBlueprints[0],exact={confidence:'high' as const,candidates:[{blueprint,score:1}]}
it('requires two consecutive exact matches to the same canonical ID',()=>{const first=advanceAutoCapture({count:0},exact);expect(first.count).toBe(1);expect(advanceAutoCapture(first,exact).count).toBe(2)})
it('resets stability when the name changes or disappears',()=>{const prior={id:blueprint.id,count:2};expect(advanceAutoCapture(prior,{...exact,candidates:[{blueprint:{...blueprint,id:999},score:1}]}).count).toBe(1);expect(advanceAutoCapture(prior,{confidence:'none',candidates:[]})).toEqual({count:0})})
it('does not automatically capture fuzzy readings or duplicate exact catalog names',()=>{expect(advanceAutoCapture({count:0},{...exact,candidates:[{blueprint,score:.98}]}).count).toBe(0);expect(advanceAutoCapture({count:0},{...exact,candidates:[{blueprint,score:1},{blueprint:{...blueprint,id:999},score:1}]}).count).toBe(0)})
