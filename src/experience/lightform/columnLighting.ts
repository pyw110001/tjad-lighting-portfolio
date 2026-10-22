import * as THREE from 'three';

export const COLUMN_CYCLE_SECONDS = 9;
export const COLUMN_WARM_WHITE = 0xffdfb4;
export type ColumnPreset = 'reference' | 'warm';

/** A slow upward reveal, followed by a soft full-height fade to darkness. */
export function columnCycle(seconds: number) {
  const phase = ((seconds % COLUMN_CYCLE_SECONDS) + COLUMN_CYCLE_SECONDS) % COLUMN_CYCLE_SECONDS;
  const fill = THREE.MathUtils.smoothstep(phase, 0, COLUMN_CYCLE_SECONDS * .6);
  const breath = Math.pow(Math.max(0, Math.sin(Math.PI * phase / COLUMN_CYCLE_SECONDS)), 1.2);
  return { fill, breath };
}

export function createColumnLighting(initialPreset: ColumnPreset = 'warm') {
  const state = { fill: 0, breath: 0 };
  const shared = { uFill: { value: 0 }, uBreath: { value: 0 }, uOn: { value: 1 }, uWarm: { value: new THREE.Color(COLUMN_WARM_WHITE) },
    uTime: { value: 0 }, uReference: { value: initialPreset === 'reference' ? 1 : 0 } };
  let epoch: number | undefined;
  return {
    state,
    setPreset(preset: ColumnPreset) { shared.uReference.value = preset === 'reference' ? 1 : 0; epoch = undefined; },
    material(height: number, phase = 0, palette = 0, baseAtZero = false) {
      return new THREE.ShaderMaterial({ uniforms: { ...shared, uHeight: { value: height }, uBase: { value: baseAtZero ? 0 : .5 },
        uPhase: { value: phase }, uPalette: { value: palette }, uBottom: { value: 0 } },
        vertexShader: `uniform float uHeight,uBase,uBottom; varying float vHeight;
          void main(){vHeight=clamp((position.y-uBottom)/uHeight+uBase,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float uFill,uBreath,uOn,uTime,uReference,uPhase,uPalette;uniform vec3 uWarm;varying float vHeight;
          void main(){float reveal=1.-smoothstep(uFill-.035,uFill+.025,vHeight);
            vec3 signal=uWarm*reveal*uBreath*uOn*1.25;
            if(uReference>.5){
              float level=.46+.25*sin(uTime*.18+uPhase)+.09*sin(uTime*.29+uPhase*2.);
              vec3 color=uPalette<.5?vec3(.76,.21,1.):uPalette<1.5?vec3(.25,1.,.79):uPalette<2.5?vec3(1.,.64,.3):uPalette<3.5?vec3(.68,.23,1.):vec3(.33,1.,.9);
              float fill=1.-smoothstep(level-.025,level+.025,vHeight);
              if(fill<.001)discard;
              float band=.78+.22*sin(vHeight*3.14+uPhase);
              signal=color*fill*band*uOn*2.8;
            }
            else if(reveal*uBreath<.001)discard;
            gl_FragColor=vec4(vec3(.00015)+signal,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      });
    },
    update(time: number) {
      epoch ??= time;
      Object.assign(state, columnCycle(time - epoch));
      shared.uTime.value = time;
      shared.uFill.value = state.fill; shared.uBreath.value = state.breath;
      return state;
    },
  };
}
