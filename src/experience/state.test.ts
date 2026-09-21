import { describe,expect,it } from 'vitest';
import { initialLab,labReducer } from './state';
describe('light lab state',()=>{
 it('clamps numeric and pointer inputs',()=>{expect(labReducer(initialLab,{type:'intensity',value:140}).intensity).toBe(100);expect(labReducer(initialLab,{type:'position',value:[-1,4]}).position).toEqual([.05,.95]);});
 it('changes modes and restores defaults',()=>{const changed=labReducer(initialLab,{type:'pattern',value:'pulse'});expect(changed.pattern).toBe('pulse');expect(labReducer(changed,{type:'reset'})).toEqual(initialLab);});
 it('toggles pause',()=>{expect(labReducer(initialLab,{type:'pause'}).paused).toBe(true);});
});
