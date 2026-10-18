import * as THREE from 'three'
import type { ParticleData } from './imageAnalysis'

export type ParticleControls = {
  density: number
  motion: number
  dispersion: number
  size: number
  mode: number
}

export type AudioLevels = { bass: number; mid: number; high: number; beat: number }

const vertexShader = /* glsl */ `
  attribute vec4 aBehavior;
  attribute vec4 aMeta;
  attribute vec3 aFlow;
  attribute vec3 aAnchor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime;
  uniform float uMotion;
  uniform float uDispersion;
  uniform float uSize;
  uniform float uMode;
  uniform float uPixelRatio;
  uniform vec4 uAudio;

  void main() {
    float phase = aMeta.x * 6.283185;
    float lum = aMeta.y;
    float neutral = max(0.0, 1.0 - dot(aBehavior, vec4(1.0)));
    float t = uTime;
    vec2 base = position.xy;
    vec2 contour = normalize(aFlow.xy + vec2(0.0001));
    vec2 normal = vec2(-contour.y, contour.x);
    float travel = t * (0.25 + uMotion * 2.65 + uAudio.y * 2.2);
    float wave = travel + phase * 6.283185;

    // Every pigment moves along the sampled image's local edge direction.
    vec2 warm = normal * sin(wave * 1.7) * 0.105 + contour * sin(wave * 0.65) * 0.045;
    vec2 cool = contour * sin(wave * 0.8) * 0.15 + normal * cos(wave * 0.42) * 0.025;
    vec2 organic = contour * sin(wave + base.y * 3.4) * 0.09 + normal * cos(wave * 0.65) * 0.045;
    vec2 violet = contour * cos(wave) * 0.095 + normal * sin(wave) * 0.095;
    vec2 dust = contour * sin(wave * 0.38) * 0.042 + normal * cos(wave * 0.31) * 0.022;

    vec2 drift = warm * aBehavior.x + cool * aBehavior.y + organic * aBehavior.z + violet * aBehavior.w + dust * neutral;
    if (uMode > 0.5 && uMode < 1.5) drift += contour * sin(wave * 0.8) * 0.045;
    if (uMode > 1.5 && uMode < 2.5) drift += contour * sin(wave * 1.1) * 0.065;
    if (uMode > 2.5) drift += normal * sin(wave * 2.1) * 0.055;
    drift *= uMotion * (0.45 + uDispersion * 0.9) * (0.7 + aFlow.z * 0.45);
    drift += contour * min(aMeta.w, 1.0) * sin(wave * 0.75) * uMotion * 0.07;

    vec2 p = base * (1.0 + uAudio.x * 0.105) + drift;
    if (aMeta.w > 1.5) {
      float orbitAngle = t * 0.18 * uMotion;
      float c = cos(orbitAngle);
      float s = sin(orbitAngle);
      p = mat2(c, -s, s, c) * p;
    }
    float depth = position.z + uAudio.x * 0.2 * sin(phase + t);
    p += normalize(base + vec2(0.001)) * uAudio.w * 0.16;
    p += vec2(sin(phase * 5.0 + t * 5.0), cos(phase * 4.0 + t * 4.0)) * uAudio.z * 0.028;

    vec4 projected = projectionMatrix * modelViewMatrix * vec4(p, depth, 1.0);
    gl_Position = projected;
    float interaction = clamp(length(position.xy - aAnchor.xy) * 1.7, 0.0, 1.0);
    float sparkle = 0.6 + 0.4 * sin(phase * 15.0 + t * (uMotion * 3.2 + uAudio.z * 8.0));
    float orbitSize = aMeta.w > 1.5 ? (aMeta.x > 0.96 ? 2.25 : 1.28) : 1.0;
    gl_PointSize = clamp((1.1 + uSize * 1.9 + lum * 1.2 + uAudio.z * 2.2 + interaction * 1.7) * uPixelRatio * (0.74 + sparkle * 0.44) * orbitSize, 1.0, 14.0);
    vColor = color;
    vAlpha = aMeta.z * (0.34 + lum * 0.53 + uAudio.z * 0.24 + interaction * 0.35) * (0.8 + sparkle * 0.3);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 point = gl_PointCoord * 2.0 - 1.0;
    float radius = dot(point, point);
    float core = exp(-radius * 3.8);
    float edge = smoothstep(1.0, 0.08, radius);
    float alpha = edge * core * vAlpha;
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(vColor * 1.43 + vec3(0.035), alpha);
  }
`

export class ParticleEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 20)
  private material: THREE.ShaderMaterial
  private geometry?: THREE.BufferGeometry
  private points?: THREE.Points
  private data?: ParticleData
  private host: HTMLElement
  private resizeObserver: ResizeObserver
  private lastFrame = 0
  private measuredFrames = 0
  private measuredTime = 0
  private adaptive = 1
  private pixelScale = 1
  private time = 0
  private playing = true
  private pointerHeld = false
  private pointerInside = false
  private cursor = new THREE.Vector2()
  private livePositions?: Float32Array
  private velocities?: Float32Array
  private interactionActive = false
  private controls: ParticleControls = { density: 0.72, motion: 0.58, dispersion: 0.4, size: 1.2, mode: 0 }
  private onError: (message: string | null) => void

  constructor(host: HTMLElement, onError: (message: string | null) => void, private readonly pixelRatioBoost = 1,
    private readonly outputSize?: { width: number; height: number }) {
    this.host = host
    this.onError = onError
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x080d10)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.className = 'particle-canvas'
    this.renderer.domElement.setAttribute('aria-label', 'Interactive particle artwork')
    this.host.appendChild(this.renderer.domElement)
    this.camera.position.z = 5
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: this.controls.motion },
        uDispersion: { value: this.controls.dispersion },
        uSize: { value: this.controls.size },
        uMode: { value: 0 },
        uPixelRatio: { value: 1 },
        uAudio: { value: new THREE.Vector4(0, 0, 0, 0) },
      },
    })
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.host)
    this.resize()
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerenter', this.handlePointerEnter)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('contextmenu', this.handleContextMenu)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
    window.addEventListener('pointerup', this.handlePointerUp)
    this.renderer.setAnimationLoop(this.animate)
  }

  private resize() {
    const width = this.outputSize?.width ?? Math.max(1, this.host.clientWidth)
    const height = this.outputSize?.height ?? Math.max(1, this.host.clientHeight)
    const halfHeight = 2
    const halfWidth = halfHeight * (width / height)
    this.camera.left = -halfWidth
    this.camera.right = halfWidth
    this.camera.top = halfHeight
    this.camera.bottom = -halfHeight
    this.camera.updateProjectionMatrix()
    // Photo projection must not inherit the tiny preview panel's resolution.
    // A fixed source keeps its dimensions while the panel opens or collapses.
    const ratio = this.outputSize ? 1 : Math.min(2.5, Math.min(window.devicePixelRatio || 1, 1.7) * this.pixelScale * this.pixelRatioBoost)
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.material.uniforms.uPixelRatio.value = this.outputSize ? width / 960 : ratio
  }

  private worldPosition(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width - 0.5) * (this.camera.right - this.camera.left),
      (0.5 - (event.clientY - rect.top) / rect.height) * (this.camera.top - this.camera.bottom),
    )
  }

  /** UV coordinates shared by the photo compositor and its pointer hit map. */
  setPointer(u: number, v: number, held: boolean, scatter: boolean, inside = true) {
    this.pointerInside = inside;
    this.pointerHeld = inside && held && !scatter;
    if (!inside) return;
    this.cursor.set((u - .5) * (this.camera.right - this.camera.left), (.5 - v) * (this.camera.top - this.camera.bottom));
    this.interactionActive = true;
    if (scatter) this.explode(this.cursor);
  }

  private handlePointerDown = (event: PointerEvent) => {
    const position = this.worldPosition(event)
    this.cursor.copy(position)
    this.pointerInside = true
    if (event.button === 0) {
      this.pointerHeld = true
      this.renderer.domElement.setPointerCapture(event.pointerId)
      this.interactionActive = true
    } else if (event.button === 2) {
      event.preventDefault()
      this.explode(position)
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    this.cursor.copy(this.worldPosition(event))
    this.pointerInside = true
    this.interactionActive = true
  }

  private handlePointerUp = () => { this.pointerHeld = false }
  private handlePointerEnter = (event: PointerEvent) => {
    this.pointerInside = true
    this.cursor.copy(this.worldPosition(event))
    this.interactionActive = true
  }
  private handlePointerLeave = () => { this.pointerInside = false }
  private handleContextMenu = (event: MouseEvent) => { event.preventDefault() }
  private handleContextLost = (event: Event) => {
    event.preventDefault()
    this.onError('The graphics context was lost. Use Retry to restore the canvas.')
  }
  private handleContextRestored = () => { this.onError(null) }

  private explode(position: THREE.Vector2) {
    if (!this.livePositions || !this.velocities || !this.data) return
    const positions = this.livePositions
    const velocities = this.velocities
    for (let point = 0; point < this.data.count; point++) {
      const offset = point * 3
      const dx = positions[offset] - position.x
      const dy = positions[offset + 1] - position.y
      const distanceSquared = dx * dx + dy * dy
      if (distanceSquared >= 2.25) continue
      const distance = Math.sqrt(distanceSquared)
      const falloff = 1 - distance / 1.5
      const impulse = Math.min(9, 2.6 / (distanceSquared + 0.12)) * falloff
      const directionX = distance > 0.001 ? dx / distance : Math.cos(this.data.meta[point * 4] * Math.PI * 2)
      const directionY = distance > 0.001 ? dy / distance : Math.sin(this.data.meta[point * 4] * Math.PI * 2)
      velocities[point * 2] += directionX * impulse
      velocities[point * 2 + 1] += directionY * impulse
    }
    this.interactionActive = true
  }

  private updateInteraction(delta: number) {
    if ((!this.pointerInside && !this.interactionActive) || !this.livePositions || !this.velocities || !this.data || !this.geometry) return
    const dt = Math.min(delta, 0.033)
    if (dt <= 0) return
    const positions = this.livePositions
    const anchors = this.data.positions
    const velocities = this.velocities
    const damping = Math.exp(-5.4 * dt)
    const radius = this.pointerHeld ? 1.22 : 0.72
    let maximumEnergy = 0
    for (let point = 0; point < this.data.count; point++) {
      const offset = point * 3
      const velocityOffset = point * 2
      let x = positions[offset]
      let y = positions[offset + 1]
      const distanceX = this.cursor.x - x
      const distanceY = this.cursor.y - y
      const distanceSquared = distanceX * distanceX + distanceY * distanceY
      const inRange = this.pointerInside && distanceSquared > 0.0001 && distanceSquared < radius * radius
      if (!inRange && Math.abs(x - anchors[offset]) + Math.abs(y - anchors[offset + 1]) + Math.abs(velocities[velocityOffset]) + Math.abs(velocities[velocityOffset + 1]) < 0.00002) continue
      let vx = velocities[velocityOffset] + (anchors[offset] - x) * 15 * dt
      let vy = velocities[velocityOffset + 1] + (anchors[offset + 1] - y) * 15 * dt
      if (inRange) {
          const distance = Math.sqrt(distanceSquared)
          const falloff = (1 - distance / radius) ** 2
          const directionX = distanceX / distance
          const directionY = distanceY / distance
          const attraction = (this.pointerHeld ? 19 : 2.8) * falloff
          const rotation = (this.pointerHeld ? 18 : 5.2) * falloff
          vx += (directionX * attraction - directionY * rotation) * dt
          vy += (directionY * attraction + directionX * rotation) * dt
      }
      vx *= damping
      vy *= damping
      x += vx * dt
      y += vy * dt
      const displacementX = x - anchors[offset]
      const displacementY = y - anchors[offset + 1]
      const displacement = Math.hypot(displacementX, displacementY)
      const limit = this.pointerHeld ? 1.12 : 0.82
      if (displacement > limit) {
        x = anchors[offset] + displacementX * limit / displacement
        y = anchors[offset + 1] + displacementY * limit / displacement
        vx *= 0.6
        vy *= 0.6
      }
      positions[offset] = x
      positions[offset + 1] = y
      velocities[velocityOffset] = vx
      velocities[velocityOffset + 1] = vy
      if (!this.pointerInside) maximumEnergy = Math.max(maximumEnergy, Math.abs(x - anchors[offset]), Math.abs(y - anchors[offset + 1]), Math.abs(vx), Math.abs(vy))
    }
    if (!this.pointerInside && maximumEnergy < 0.0008) {
      positions.set(anchors)
      velocities.fill(0)
      this.interactionActive = false
    }
    ;(this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  private animate = (timestamp: number) => {
    const delta = this.lastFrame ? Math.min((timestamp - this.lastFrame) / 1000, 0.08) : 0
    this.lastFrame = timestamp
    if (this.playing) this.time += delta
    this.material.uniforms.uTime.value = this.time
    this.updateInteraction(delta)
    if (!document.hidden) this.renderer.render(this.scene, this.camera)

    if (document.hidden) {
      this.measuredFrames = 0
      this.measuredTime = 0
      return
    }
    this.measuredFrames++
    this.measuredTime += delta
    if (this.measuredTime >= 2.4) {
      const fps = this.measuredFrames / this.measuredTime
      if (fps < 34 && this.adaptive > 0.45) {
        this.adaptive = Math.max(0.45, this.adaptive - 0.13)
        this.pixelScale = Math.max(0.72, this.pixelScale - 0.08)
        this.updateDrawRange()
        this.resize()
      } else if (fps > 55 && this.adaptive < 1) {
        this.adaptive = Math.min(1, this.adaptive + 0.07)
        this.pixelScale = Math.min(1, this.pixelScale + 0.04)
        this.updateDrawRange()
        this.resize()
      }
      this.measuredFrames = 0
      this.measuredTime = 0
    }
  }

  setData(data: ParticleData) {
    if (this.points) this.scene.remove(this.points)
    this.geometry?.dispose()
    const geometry = new THREE.BufferGeometry()
    this.livePositions = new Float32Array(data.positions)
    this.velocities = new Float32Array(data.count * 2)
    geometry.setAttribute('position', new THREE.BufferAttribute(this.livePositions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('aAnchor', new THREE.BufferAttribute(data.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    geometry.setAttribute('aBehavior', new THREE.BufferAttribute(data.behavior, 4))
    geometry.setAttribute('aFlow', new THREE.BufferAttribute(data.flow, 3))
    geometry.setAttribute('aMeta', new THREE.BufferAttribute(data.meta, 4))
    geometry.computeBoundingSphere()
    this.geometry = geometry
    this.data = data
    this.points = new THREE.Points(geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)
    this.updateDrawRange()
    this.reset()
  }

  private updateDrawRange() {
    if (this.geometry && this.data) this.geometry.setDrawRange(0, Math.floor(this.data.count * this.controls.density * this.adaptive))
  }

  setControls(controls: ParticleControls) {
    this.controls = controls
    this.material.uniforms.uMotion.value = controls.motion
    this.material.uniforms.uDispersion.value = controls.dispersion
    this.material.uniforms.uSize.value = controls.size
    this.material.uniforms.uMode.value = controls.mode
    this.updateDrawRange()
  }

  setAudio(levels: AudioLevels) {
    if (this.playing) this.material.uniforms.uAudio.value.set(levels.bass, levels.mid, levels.high, levels.beat)
  }

  setPlaying(playing: boolean) { this.playing = playing }
  get canvas() { return this.renderer.domElement }
  seek(seconds: number) {
    this.time = Math.max(0, seconds)
    this.material.uniforms.uTime.value = this.time
  }
  getTime() { return this.time }
  reset() {
    this.time = 0
    if (this.livePositions && this.data) this.livePositions.set(this.data.positions)
    this.velocities?.fill(0)
    if (this.geometry) (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    this.interactionActive = false
  }

  capture() {
    this.renderer.render(this.scene, this.camera)
    return new Promise<Blob>((resolve, reject) => {
      this.renderer.domElement.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not export PNG.')), 'image/png')
    })
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointermove', this.handlePointerMove)
    canvas.removeEventListener('pointerenter', this.handlePointerEnter)
    canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    canvas.removeEventListener('contextmenu', this.handleContextMenu)
    canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    window.removeEventListener('pointerup', this.handlePointerUp)
    this.geometry?.dispose()
    this.material.dispose()
    this.renderer.dispose()
    canvas.remove()
  }
}
