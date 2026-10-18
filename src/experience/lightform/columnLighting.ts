import * as THREE from 'three';

export const COLUMN_CYCLE_SECONDS = 9;
export const COLUMN_WARM_WHITE = 0xffdfb4;

/** A slow upward reveal, followed by a soft full-height fade to darkness. */
export function columnCycle(seconds: number) {
  const phase = ((seconds % COLUMN_CYCLE_SECONDS) + COLUMN_CYCLE_SECONDS) % COLUMN_CYCLE_SECONDS;
  const fill = THREE.MathUtils.smoothstep(phase, 0, COLUMN_CYCLE_SECONDS * .6);
  const breath = Math.pow(Math.max(0, Math.sin(Math.PI * phase / COLUMN_CYCLE_SECONDS)), 1.2);
  return { fill, breath };
}

export function createColumnLighting() {
  const state = { fill: 0, breath: 0 };
  const shared = { uFill: { value: 0 }, uBreath: { value: 0 }, uOn: { value: 1 }, uWarm: { value: new THREE.Color(COLUMN_WARM_WHITE) } };
  let epoch: number | undefined;
  return {
    state,
    material(height: number) {
      return new THREE.ShaderMaterial({ uniforms: { ...shared, uHeight: { value: height } },
        vertexShader: `uniform float uHeight; varying float vHeight;
          void main(){vHeight=clamp(position.y/uHeight+.5,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float uFill,uBreath,uOn;uniform vec3 uWarm;varying float vHeight;
          void main(){float reveal=1.-smoothstep(uFill-.035,uFill+.025,vHeight);
            vec3 signal=uWarm*reveal*uBreath*uOn*1.25;
            gl_FragColor=vec4(vec3(.00015)+signal,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      });
    },
    update(time: number) {
      epoch ??= time;
      Object.assign(state, columnCycle(time - epoch));
      shared.uFill.value = state.fill; shared.uBreath.value = state.breath;
      return state;
    },
  };
}
