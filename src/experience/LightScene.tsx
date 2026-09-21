import { Component, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  InstancedMesh,
  Object3D,
  PCFShadowMap,
  CanvasTexture,
  RepeatWrapping,
  ShaderMaterial,
  Vector3
} from 'three';
import type { FullLabState } from './labState';
import { calculateSunPosition, kelvinToRGB } from './labState';

interface SceneProps {
  mode: 'field' | 'pixel' | 'color';
  state: FullLabState;
  active: boolean;
  reduced: boolean;
  onLost: () => void;
}

/**
 * Creates subtle procedural architectural surface grain (Concrete & Stone)
 */
function useProceduralConcrete() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const noise = 120 + Math.random() * 28;
      img.data[i] = noise;
      img.data[i + 1] = noise;
      img.data[i + 2] = noise;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
  }, []);
}

/**
 * 01 LIGHT FIELD Architecture Showroom
 * Colonnaded architectural courtyard with high clerestory light well,
 * cantilevered concrete beams, water terrace, and sunlight/artificial light washes.
 */
function LightFieldArchitecture({ state }: { state: FullLabState }) {
  const concreteTexture = useProceduralConcrete();
  const lf = state.lightField;

  // Compute celestial solar vector & color
  const sun = useMemo(
    () => calculateSunPosition(lf.time, lf.angle),
    [lf.time, lf.angle]
  );

  // Artificial light color from Kelvin
  const artColor = useMemo(
    () => new Color(...kelvinToRGB(lf.tempKelvin)),
    [lf.tempKelvin]
  );

  const sunIntensity =
    lf.lightType === 'artificial'
      ? 0.2
      : (lf.intensity / 100) * 2.6 * (0.35 + Math.sin(sun.progress * Math.PI) * 0.65);

  const artificialIntensity =
    lf.lightType === 'sun'
      ? 0
      : (lf.intensity / 100) * 16;

  const ambientIntensity =
    lf.lightType === 'ambient'
      ? 1.4
      : 0.45 + (lf.intensity / 100) * 0.35;

  return (
    <>
      <ambientLight intensity={ambientIntensity} color="#d4dde6" />
      <hemisphereLight
        args={['#e4ecf5', '#1a1d22', 0.85]}
      />

      {/* Main Solar Directional Light */}
      <directionalLight
        position={sun.position}
        intensity={sunIntensity}
        color={sun.colorHex}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />

      {/* Artificial Architectural Wall Washers (Spotlights) */}
      <spotLight
        position={[-1.2, 5.2, 1.8]}
        target-position={[-1.2, 0, -2.5]}
        intensity={artificialIntensity}
        color={artColor}
        angle={Math.PI / 4.5}
        penumbra={0.7}
        distance={22}
        castShadow
        shadow-bias={-0.001}
      />
      <spotLight
        position={[2.4, 5.2, 1.8]}
        target-position={[2.4, 0, -2.5]}
        intensity={artificialIntensity * 0.9}
        color={artColor}
        angle={Math.PI / 4.5}
        penumbra={0.7}
        distance={22}
      />

      {/* Architectural Space Geometry */}
      <group position={[0, 0, 0]}>
        {/* Rear Monumental Wall with Deep Opening */}
        <mesh position={[0, 3.4, -3.2]} receiveShadow castShadow>
          <boxGeometry args={[14, 7.2, 0.5]} />
          <meshStandardMaterial
            color="#b6b0a6"
            roughness={0.88}
            metalness={0.05}
            bumpMap={concreteTexture ?? undefined}
            bumpScale={0.03}
          />
        </mesh>

        {/* Tall Colonnade (Pillars casting dramatic shadows) */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            position={[-4.0 + i * 2.0, 3.0, 0.4]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.38, 6.2, 0.95]} />
            <meshStandardMaterial
              color="#cfc9be"
              roughness={0.82}
              bumpMap={concreteTexture ?? undefined}
              bumpScale={0.02}
            />
          </mesh>
        ))}

        {/* Cantilevered Roof / Clerestory Beam */}
        <mesh position={[0, 6.1, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[13.5, 0.45, 4.8]} />
          <meshStandardMaterial color="#9ea3a4" roughness={0.9} />
        </mesh>

        {/* Architectural Plinth / Pedestal / Bench */}
        <mesh position={[0.8, 0.45, -1.1]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.9, 1.4]} />
          <meshStandardMaterial color="#ded7cc" roughness={0.75} />
        </mesh>

        {/* Floor: Basalt stone terrace with subtle reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color="#23262a"
            roughness={0.42}
            metalness={0.22}
          />
        </mesh>

        {/* Reflecting Pool Slab */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.2, 0.02, 2.8]} receiveShadow>
          <planeGeometry args={[6.5, 3.8]} />
          <meshStandardMaterial
            color="#141920"
            roughness={0.12}
            metalness={0.65}
          />
        </mesh>
      </group>
    </>
  );
}

/**
 * 02 PIXEL FACADE Media Wall
 * High-performance GPU GLSL procedural media facade shader (64x32 LED matrix).
 * Renders realistic luminous LED diode cores, atmospheric radiance glow,
 * architectural glass panel mullions, and real-time wave/ripple/flow/pattern/text dynamics.
 */
const pixelFacadeVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pixelFacadeFragmentShader = `
  uniform float uTime;
  uniform int uPattern;
  uniform float uBrightness;
  uniform vec3 uColor;
  varying vec2 vUv;

  float isCharPixel(int charId, int px, int py) {
    if (px < 0 || px > 4 || py < 0 || py > 6) return 0.0;
    if (charId == 0) { // 'T'
      return (py == 6 || px == 2) ? 1.0 : 0.0;
    } else if (charId == 1) { // 'J'
      if (py == 6) return 1.0;
      if (px == 3 && py > 0) return 1.0;
      if (py == 0 && (px >= 1 && px <= 2)) return 1.0;
      if (px == 0 && (py >= 1 && py <= 2)) return 1.0;
      return 0.0;
    } else if (charId == 2) { // 'A'
      if (py == 6 && (px >= 1 && px <= 3)) return 1.0;
      if ((px == 0 || px == 4) && py <= 5) return 1.0;
      if (py == 3) return 1.0;
      return 0.0;
    } else if (charId == 3) { // 'D'
      if (px == 0) return 1.0;
      if ((py == 0 || py == 6) && px <= 3) return 1.0;
      if (px == 4 && (py >= 1 && py <= 5)) return 1.0;
      return 0.0;
    }
    return 0.0;
  }

  void main() {
    vec2 grid = vec2(64.0, 32.0);
    vec2 st = vUv * grid;
    vec2 cell = floor(st);
    vec2 f = fract(st) - 0.5;
    float dist = length(f);

    float patternVal = 0.0;

    if (uPattern == 0) {
      // Wave: fluid multi-frequency sinusoidal wave
      float w1 = sin(cell.x * 0.15 + cell.y * 0.12 - uTime * 2.6);
      float w2 = cos(cell.x * 0.08 - cell.y * 0.16 + uTime * 1.8);
      float w3 = sin(length(cell - vec2(32.0, 16.0)) * 0.12 - uTime * 1.5);
      patternVal = 0.18 + 0.82 * clamp((w1 + w2 + w3 + 3.0) / 6.0, 0.0, 1.0);
    } else if (uPattern == 1) {
      // Ripple: concentric expanding radar rings
      float d = length(cell - vec2(32.0, 16.0));
      float pulse = sin(d * 0.45 - uTime * 4.0) * 0.5 + 0.5;
      patternVal = 0.15 + 0.85 * pow(pulse, 2.2);
    } else if (uPattern == 2) {
      // Flow: vertical digital streams / data rain
      float speed = 1.0 + mod(cell.x * 3.0, 5.0) * 0.25;
      float cascade = fract(cell.y * 0.06 - uTime * 0.9 * speed);
      patternVal = 0.12 + 0.88 * pow(cascade, 3.0);
    } else if (uPattern == 3) {
      // Pattern: diagonal parametric diamond lattice
      float d1 = mod(cell.x + cell.y, 4.0);
      float d2 = mod(cell.x - cell.y + 100.0, 4.0);
      float breath = sin(uTime * 2.2) * 0.35 + 0.65;
      patternVal = (d1 < 1.0 || d2 < 1.0) ? (0.95 * breath) : 0.16;
    } else if (uPattern == 4) {
      // Text: "TJAD" centered dot-matrix typography
      int cx = int(cell.x);
      int cy = int(cell.y);
      int py = cy - 13;
      float textHit = 0.0;
      if (py >= 0 && py <= 6) {
        if (cx >= 18 && cx <= 22) textHit = isCharPixel(0, cx - 18, py);
        else if (cx >= 26 && cx <= 30) textHit = isCharPixel(1, cx - 26, py);
        else if (cx >= 34 && cx <= 38) textHit = isCharPixel(2, cx - 34, py);
        else if (cx >= 42 && cx <= 46) textHit = isCharPixel(3, cx - 42, py);
      }
      float bgShimmer = sin(cell.x * 0.2 + uTime * 1.5) * 0.05 + 0.12;
      patternVal = textHit > 0.5 ? 1.0 : bgShimmer;
    }

    // LED Optics: high-intensity core diode + soft radiant bloom halo
    float ledCore = smoothstep(0.35, 0.16, dist);
    float ledHalo = smoothstep(0.48, 0.0, dist) * 0.65;
    float ledOptics = ledCore + ledHalo;

    // Architectural glass panel frame seams
    float mullionX = smoothstep(0.02, 0.06, abs(fract(vUv.x * 8.0) - 0.5) * 2.0);
    float mullionY = smoothstep(0.02, 0.06, abs(fract(vUv.y * 4.0) - 0.5) * 2.0);
    float glassMullion = mullionX * mullionY * 0.15 + 0.85;

    // Color mixing: diode center burns towards crisp white for realistic LED intensity
    vec3 diodeColor = mix(uColor, vec3(1.0), ledCore * 0.6);
    vec3 rgb = diodeColor * patternVal * uBrightness * ledOptics * glassMullion;

    // Tinted architectural glass background with dark ambient reflection
    vec3 glassBg = vec3(0.03, 0.04, 0.06);

    gl_FragColor = vec4(rgb + glassBg, 1.0);
  }
`;

function PixelFacadeArchitecture({
  state,
  reduced
}: {
  state: FullLabState;
  reduced: boolean;
}) {
  const timer = useRef(0);
  const pf = state.pixelFacade;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPattern: { value: 0 },
      uBrightness: { value: 0.85 },
      uColor: { value: new Color('#80c3f4') }
    }),
    []
  );

  const shaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: pixelFacadeVertexShader,
        fragmentShader: pixelFacadeFragmentShader,
        uniforms
      }),
    [uniforms]
  );

  useFrame((_, delta) => {
    if (!pf.paused && !reduced) {
      timer.current += Math.min(delta, 0.05) * (pf.speed / 50);
      uniforms.uTime.value = timer.current;
    }
    uniforms.uBrightness.value = pf.brightness / 100;
    uniforms.uPattern.value =
      pf.pattern === 'wave'
        ? 0
        : pf.pattern === 'ripple'
          ? 1
          : pf.pattern === 'flow'
            ? 2
            : pf.pattern === 'pattern'
              ? 3
              : 4;
    uniforms.uColor.value.set(pf.color);
  });

  return (
    <>
      {/* Night Sky / Architectural Illumination */}
      <ambientLight intensity={0.9} color="#202a3a" />
      <directionalLight position={[8, 14, 10]} intensity={1.2} color="#a0b8d4" />

      {/* Main Building Tower */}
      <group position={[0, 0, 0]}>
        {/* Main Body */}
        <mesh position={[0, 4.0, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[13.2, 7.4, 1.6]} />
          <meshStandardMaterial color="#1e242d" roughness={0.65} metalness={0.35} />
        </mesh>

        {/* Media Facade Screen */}
        <mesh position={[0, 4.0, 0.22]}>
          <planeGeometry args={[11.2, 5.6]} />
          <primitive object={shaderMaterial} attach="material" />
        </mesh>

        {/* Screen Metal Border / Frame */}
        {/* Top Trim */}
        <mesh position={[0, 6.84, 0.24]}>
          <boxGeometry args={[11.36, 0.12, 0.06]} />
          <meshStandardMaterial color="#0f131a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Bottom Trim */}
        <mesh position={[0, 1.16, 0.24]}>
          <boxGeometry args={[11.36, 0.12, 0.06]} />
          <meshStandardMaterial color="#0f131a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Left Trim */}
        <mesh position={[-5.64, 4.0, 0.24]}>
          <boxGeometry args={[0.12, 5.72, 0.06]} />
          <meshStandardMaterial color="#0f131a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Right Trim */}
        <mesh position={[5.64, 4.0, 0.24]}>
          <boxGeometry args={[0.12, 5.72, 0.06]} />
          <meshStandardMaterial color="#0f131a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Roofline Linear Wash Light */}
        <mesh position={[0, 7.74, 0.22]}>
          <boxGeometry args={[13.2, 0.06, 0.04]} />
          <meshBasicMaterial color="#bfe0ff" />
        </mesh>
        <pointLight position={[-3.8, 7.7, 0.6]} intensity={1.4} color="#bfe0ff" distance={6} />
        <pointLight position={[3.8, 7.7, 0.6]} intensity={1.4} color="#bfe0ff" distance={6} />

        {/* Entrance Podium & Glass Canopy */}
        <mesh position={[0, 0.9, 0.8]}>
          <boxGeometry args={[5.8, 0.1, 1.4]} />
          <meshStandardMaterial color="#2a3340" roughness={0.25} metalness={0.7} />
        </mesh>
        {/* Warm 3000K Entrance Downlights */}
        <pointLight position={[-1.8, 0.75, 0.8]} intensity={1.4} color="#ffbe76" distance={4.0} />
        <pointLight position={[1.8, 0.75, 0.8]} intensity={1.4} color="#ffbe76" distance={4.0} />

        {/* Ground Plaza with Basalt Specular Reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#0e1217" roughness={0.25} metalness={0.6} />
        </mesh>
      </group>
    </>
  );
}

/**
 * 04 COLOR STUDIO Spatial Light Atmosphere
 * Showroom with recessed ceiling coves & perimeter wall-grazing wash lights.
 * Realistically presents 3000K, 4000K, 6000K & RGB ambient spatial emotion.
 */
function ColorStudioArchitecture({ state }: { state: FullLabState }) {
  const cs = state.colorStudio;

  // Determine light color
  const lightColor = useMemo(() => {
    if (cs.preset === 'warm3000') return new Color(...kelvinToRGB(3000));
    if (cs.preset === 'neutral4000') return new Color(...kelvinToRGB(4000));
    if (cs.preset === 'cool6000') return new Color(...kelvinToRGB(6000));
    return new Color(cs.customColor);
  }, [cs.preset, cs.customColor]);

  const power = (cs.intensity / 100) * 12;

  return (
    <>
      <ambientLight intensity={0.25} color="#16181d" />

      {/* Perimeter Linear Wall Grazers */}
      <pointLight
        position={[-3.2, 4.4, -1.8]}
        intensity={power * 1.5}
        distance={14}
        color={lightColor}
      />
      <pointLight
        position={[3.2, 4.4, -1.8]}
        intensity={power * 1.5}
        distance={14}
        color={lightColor}
      />
      <spotLight
        position={[0, 4.8, 1.2]}
        target-position={[0, 1.2, -2.4]}
        intensity={power * 1.2}
        color={lightColor}
        angle={Math.PI / 3.5}
        penumbra={0.8}
        castShadow
      />

      {/* Modern Corridor / Gallery Room */}
      <group position={[0, 0, 0]}>
        {/* Back Wall */}
        <mesh position={[0, 2.5, -2.8]} receiveShadow>
          <boxGeometry args={[9.5, 5.2, 0.4]} />
          <meshStandardMaterial color="#eae5dd" roughness={0.7} />
        </mesh>
        {/* Left Wall */}
        <mesh position={[-4.5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[7.5, 5.2, 0.4]} />
          <meshStandardMaterial color="#f0ece5" roughness={0.7} />
        </mesh>
        {/* Right Wall */}
        <mesh position={[4.5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[7.5, 5.2, 0.4]} />
          <meshStandardMaterial color="#f0ece5" roughness={0.7} />
        </mesh>
        {/* Recessed Ceiling Slot */}
        <mesh position={[0, 5.0, 0]}>
          <boxGeometry args={[9.2, 0.3, 7.5]} />
          <meshStandardMaterial color="#cfc9be" roughness={0.85} />
        </mesh>
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>
    </>
  );
}

/**
 * Camera Viewport Controller
 */
function CameraController({ mode }: { mode: 'field' | 'pixel' | 'color' }) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (mode === 'field') {
      camera.position.set(7.5, 4.8, 8.2);
      camera.lookAt(new Vector3(0, 1.8, 0));
    } else if (mode === 'pixel') {
      camera.position.set(0, 3.8, 11.5);
      camera.lookAt(new Vector3(0, 3.4, 0));
    } else {
      camera.position.set(0, 2.8, 6.8);
      camera.lookAt(new Vector3(0, 2.2, -1.0));
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [mode, camera, invalidate]);

  return null;
}

class Boundary extends Component<
  { children: ReactNode; onLost: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onLost();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function LightScene({
  mode,
  state,
  active,
  reduced,
  onLost
}: SceneProps) {
  return (
    <Boundary onLost={onLost}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        frameloop={
          !active
            ? 'never'
            : mode === 'pixel' && !state.pixelFacade.paused && !reduced
              ? 'always'
              : 'demand'
        }
        camera={{ position: [7.5, 4.8, 8.2], fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0a0d11']} />
        <fog attach="fog" args={['#0a0d11', 20, 60]} />
        <CameraController mode={mode} />

        {mode === 'field' && <LightFieldArchitecture state={state} />}
        {mode === 'pixel' && (
          <PixelFacadeArchitecture state={state} reduced={reduced} />
        )}
        {mode === 'color' && <ColorStudioArchitecture state={state} />}
      </Canvas>
    </Boundary>
  );
}
