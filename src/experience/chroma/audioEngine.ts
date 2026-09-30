import type { AudioLevels } from './particleEngine'

export type AudioMode = 'off' | 'file' | 'microphone'

export class AudioEngine {
  private context?: AudioContext
  private analyser?: AnalyserNode
  private data?: Uint8Array<ArrayBuffer>
  private fileSource?: MediaElementAudioSourceNode
  private micSource?: MediaStreamAudioSourceNode
  private micStream?: MediaStream
  private audio = new Audio()
  private fileUrl?: string
  private fileName = ''
  private mode: AudioMode = 'off'
  private levels: AudioLevels = { bass: 0, mid: 0, high: 0, beat: 0 }
  private bassAverage = 0
  private lastBeat = 0
  private requestId = 0

  private async ensureContext() {
    if (!this.context) {
      this.context = new AudioContext()
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.58
      this.data = new Uint8Array(this.analyser.frequencyBinCount)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  private detachInputs() {
    this.audio.pause()
    this.fileSource?.disconnect()
    this.micSource?.disconnect()
    this.micSource = undefined
    this.micStream?.getTracks().forEach((track) => track.stop())
    this.micStream = undefined
    this.analyser?.disconnect()
  }

  async useFile(file: File) {
    if (!file.type.startsWith('audio/')) throw new Error('Choose a supported audio file.')
    const requestId = ++this.requestId
    this.detachInputs()
    this.mode = 'off'
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl)
    this.fileUrl = URL.createObjectURL(file)
    this.fileName = file.name
    this.audio.src = this.fileUrl
    this.audio.load()
    await this.ensureContext()
    if (requestId !== this.requestId) return
    if (!this.context || !this.analyser) return
    this.fileSource ??= this.context.createMediaElementSource(this.audio)
    this.fileSource.connect(this.analyser)
    this.analyser.connect(this.context.destination)
    this.mode = 'file'
    try {
      await this.audio.play()
    } catch {
      // The file remains ready for an explicit click on Play.
    }
  }

  async useMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone input requires HTTPS or localhost and a supported browser.')
    }
    const requestId = ++this.requestId
    this.detachInputs()
    this.mode = 'off'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      if (requestId !== this.requestId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.micStream = stream
      await this.ensureContext()
      if (requestId !== this.requestId) {
        this.micStream?.getTracks().forEach((track) => track.stop())
        this.micStream = undefined
        return
      }
      if (!this.context || !this.analyser) return
      this.micSource = this.context.createMediaStreamSource(this.micStream)
      this.micSource.connect(this.analyser)
      this.mode = 'microphone'
    } catch (error) {
      this.micStream?.getTracks().forEach((track) => track.stop())
      this.micStream = undefined
      const name = error instanceof DOMException ? error.name : ''
      throw new Error(name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Microphone input could not be started.')
    }
  }

  async turnOff() {
    this.requestId++
    this.detachInputs()
    this.mode = 'off'
    if (this.context) await this.context.suspend()
  }

  async togglePlayback() {
    if (this.mode !== 'file') return
    if (this.audio.paused) {
      await this.ensureContext()
      await this.audio.play()
    } else {
      this.audio.pause()
    }
  }

  seek(seconds: number) {
    if (this.mode === 'file' && Number.isFinite(this.audio.duration)) this.audio.currentTime = seconds
  }

  getState() {
    return {
      mode: this.mode,
      name: this.fileName,
      playing: this.mode === 'file' && !this.audio.paused,
      currentTime: this.audio.currentTime || 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
    }
  }

  private energy(fromHz: number, toHz: number) {
    if (!this.context || !this.analyser || !this.data) return 0
    const resolution = this.context.sampleRate / this.analyser.fftSize
    const from = Math.max(0, Math.floor(fromHz / resolution))
    const to = Math.min(this.data.length - 1, Math.ceil(toHz / resolution))
    let sum = 0
    for (let index = from; index <= to; index++) sum += this.data[index]
    return sum / Math.max(1, to - from + 1) / 255
  }

  update(sensitivity: number, smoothing: number, delta: number): AudioLevels {
    const active = this.mode === 'microphone' || (this.mode === 'file' && !this.audio.paused)
    if (active && this.analyser && this.data) this.analyser.getByteFrequencyData(this.data)
    const gain = 0.6 + sensitivity * 1.6
    const targetBass = active ? Math.min(1, this.energy(20, 180) * gain) : 0
    const targetMid = active ? Math.min(1, this.energy(180, 2200) * gain) : 0
    const targetHigh = active ? Math.min(1, this.energy(2200, 12000) * gain * 1.5) : 0
    const rate = 2.5 + (1 - smoothing) * 12
    const blend = 1 - Math.exp(-delta * rate)
    this.levels.bass += (targetBass - this.levels.bass) * blend
    this.levels.mid += (targetMid - this.levels.mid) * blend
    this.levels.high += (targetHigh - this.levels.high) * blend
    this.bassAverage += (targetBass - this.bassAverage) * Math.min(1, delta * 1.6)
    const now = performance.now() / 1000
    if (active && targetBass > Math.max(0.13, this.bassAverage * 1.42) && now - this.lastBeat > 0.27) {
      this.levels.beat = 1
      this.lastBeat = now
    }
    this.levels.beat *= Math.exp(-delta * 6.5)
    return this.levels
  }

  async dispose() {
    this.requestId++
    this.detachInputs()
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl)
    this.audio.removeAttribute('src')
    this.audio.load()
    await this.context?.close()
  }
}
