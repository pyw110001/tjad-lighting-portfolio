import {HalfFloatType} from 'three/webgpu';
import AfterImageNode from 'three/addons/tsl/display/AfterImageNode.js';

// Finite, non-additive HDR feedback. A maximum prevents cumulative overexposure.
export class FieldTrails extends AfterImageNode {
  constructor(input,damp){
    super(input,damp);this.resolutionScale=.5;this.clearPending=true;
    this._compRT.texture.type=HalfFloatType;this._oldRT.texture.type=HalfFloatType;
  }
  setSize(w,h){super.setSize(Math.max(1,Math.round(w*this.resolutionScale)),Math.max(1,Math.round(h*this.resolutionScale)));}
  reset(){this.clearPending=true;}
  updateBefore(frame){
    if(this.clearPending){
      const r=frame.renderer,target=r.getRenderTarget();
      for(const rt of [this._compRT,this._oldRT]){r.setRenderTarget(rt);r.clear();}
      r.setRenderTarget(target);this.clearPending=false;
    }
    super.updateBefore(frame);
  }
}
