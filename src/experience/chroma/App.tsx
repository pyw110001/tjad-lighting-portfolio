import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  ArrowDownToLine, AudioLines, CircleHelp, Expand, ImagePlus, Mic2,
  Pause, Play, RotateCcw, Settings2, SlidersHorizontal, Upload, X,
} from 'lucide-react'
import { analyzeImage } from './imageAnalysis'
import { AudioEngine, type AudioMode } from './audioEngine'
import { ParticleEngine, type AudioLevels, type ParticleControls } from './particleEngine'
import './styles.css'
import { useChromaCopy } from './copy'
import { initialChromaSession, type ChromaImage, type ChromaSession } from './session'

type Dialog = 'settings' | 'help' | null

const initialControls = initialChromaSession.controls
const modes = ['Standard', 'Fluid', 'Orbit', 'Experimental']
const zeroLevels: AudioLevels = { bass: 0, mid: 0, high: 0, beat: 0 }

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds)) return '00:00'
  const value = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function ControlSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void
}) {
  const percentage = ((value - min) / (max - min)) * 100
  return <label className="control-row">
    <span>{label}</span>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value}
      style={{ '--range-progress': `${percentage}%` } as React.CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))} />
    <output>{value.toFixed(2)}</output>
  </label>
}

function FrequencyBars({ levels, active }: { levels: AudioLevels; active: boolean }) {
  const t = useChromaCopy()
  const bands = [levels.bass, levels.bass * 0.65 + levels.mid * 0.35, levels.mid, levels.mid * 0.35 + levels.high * 0.65, levels.high]
  return <div className={`frequency-display ${active ? 'is-active' : ''}`} aria-label="Audio frequency levels">
    {bands.map((band, index) => <div className="frequency-band" key={index}>
      <div className={`frequency-bars frequency-${index}`}>
        {Array.from({ length: 7 }, (_, bar) => <i key={bar} style={{ height: `${Math.max(12, Math.min(100, (active ? band * 95 : 18) + ((bar * 19 + index * 11) % 42)))}%` }} />)}
      </div>
      <span>{t(['Bass', 'Low Mid', 'Mid', 'High Mid', 'Treble'][index])}</span>
    </div>)}
  </div>
}

function App({ session, setSession }: { session: ChromaSession; setSession: Dispatch<SetStateAction<ChromaSession>> }) {
  const t = useChromaCopy()
  const shellRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ParticleEngine | null>(null)
  const audioRef = useRef<AudioEngine | null>(null)
  if (!audioRef.current && typeof window !== 'undefined') audioRef.current = new AudioEngine()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<ChromaImage[]>(session.images)
  const disposedRef = useRef(false)
  const lastAudioFileRef = useRef<File | null>(null)
  const audioSettingsRef = useRef({ sensitivity: 0.7, smoothing: 0.5 })
  const { images, selectedId, controls, visualPlaying } = session
  const [visualTime, setVisualTime] = useState(0)
  const [audioMode, setAudioMode] = useState<AudioMode>('off')
  const [audioState, setAudioState] = useState({ name: '', playing: false, currentTime: 0, duration: 0 })
  const [audioLevels, setAudioLevels] = useState<AudioLevels>(zeroLevels)
  const [sensitivity, setSensitivity] = useState(0.7)
  const [smoothing, setSmoothing] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphicsError, setGraphicsError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [rendererVersion, setRendererVersion] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const selected = images.find((image) => image.id === selectedId)

  const addImage = useCallback(async (blob: Blob, name: string, demo = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeImage(blob)
      if (disposedRef.current) return
      const url = URL.createObjectURL(blob)
      const item: ChromaImage = { id: crypto.randomUUID(), name, url, data, demo }
      const next = [item, ...imagesRef.current].slice(0, 8)
      imagesRef.current.slice(7).forEach((old) => URL.revokeObjectURL(old.url))
      imagesRef.current = next
      setSession((previous) => ({ ...previous, images: next, selectedId: item.id }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The image could not be processed.')
    } finally {
      setLoading(false)
    }
  }, [setSession])

  useEffect(() => {
    if (imagesRef.current.length > 0) return
    const controller = new AbortController()
    fetch('/assets/light-lab/chroma/demo-portrait-v2.png', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Demo image could not be loaded.')
        return response.blob()
      })
      .then((blob) => { if (!controller.signal.aborted) void addImage(blob, 'Studio portrait', true) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Demo image could not be loaded.') })
    return () => { controller.abort() }
  }, [addImage])

  useEffect(() => {
    if (!stageRef.current) return
    try {
      engineRef.current = new ParticleEngine(stageRef.current, setGraphicsError)
      setGraphicsError(null)
      engineRef.current.setControls(controls)
      engineRef.current.setPlaying(visualPlaying)
      if (selected) engineRef.current.setData(selected.data)
    } catch {
      setGraphicsError('WebGL is unavailable. Enable hardware acceleration or use a current desktop browser.')
    }
    return () => { engineRef.current?.dispose(); engineRef.current = null }
    // Renderer recreation is only used after a recoverable graphics error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendererVersion])

  useEffect(() => { if (selected) engineRef.current?.setData(selected.data) }, [selected])
  useEffect(() => { engineRef.current?.setControls(controls) }, [controls])
  useEffect(() => { engineRef.current?.setPlaying(visualPlaying) }, [visualPlaying])
  useEffect(() => { audioSettingsRef.current = { sensitivity, smoothing } }, [sensitivity, smoothing])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let lastUi = 0
    const tick = (now: number) => {
      const delta = Math.min(0.08, (now - last) / 1000)
      last = now
      const levels = audioRef.current?.update(audioSettingsRef.current.sensitivity, audioSettingsRef.current.smoothing, delta) ?? zeroLevels
      engineRef.current?.setAudio(levels)
      if (now - lastUi > 90) {
        setAudioLevels({ ...levels })
        const state = audioRef.current?.getState()
        if (state) {
          setAudioMode(state.mode)
          setAudioState({ name: state.name, playing: state.playing, currentTime: state.currentTime, duration: state.duration })
        }
        setVisualTime(engineRef.current?.getTime() ?? 0)
        lastUi = now
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); void audioRef.current?.dispose() }
  }, [])
  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      const shell = shellRef.current
      if (shell && document.fullscreenElement === shell) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  const onImageFile = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WebP image.'); return }
    if (file.size > 25 * 1024 * 1024) { setError('Choose an image under 25 MB.'); return }
    void addImage(file, file.name)
  }

  const onAudioFile = async (file?: File) => {
    if (!file) return
    try {
      setError(null)
      lastAudioFileRef.current = file
      await audioRef.current?.useFile(file)
      setAudioMode(audioRef.current?.getState().mode ?? 'off')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Audio could not be opened.') }
  }

  const startMicrophone = async () => {
    try {
      setError(null)
      await audioRef.current?.useMicrophone()
      setAudioMode(audioRef.current?.getState().mode ?? 'off')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Microphone could not be started.') }
  }

  const turnAudioOff = async () => {
    await audioRef.current?.turnOff()
    setAudioMode('off')
  }

  const toggleAudio = () => {
    if (audioMode !== 'off') { void turnAudioOff(); return }
    if (lastAudioFileRef.current) { void onAudioFile(lastAudioFileRef.current); return }
    audioInputRef.current?.click()
  }

  const toggleVisual = () => {
    const next = !visualPlaying
    setSession((previous) => ({ ...previous, visualPlaying: next }))
    if (audioMode === 'file' && audioState.playing === visualPlaying) void audioRef.current?.togglePlayback().catch(() => setError('Audio playback could not be started.'))
  }

  const reset = () => {
    engineRef.current?.reset()
    if (audioMode === 'file') audioRef.current?.seek(0)
    setVisualTime(0)
  }

  const exportPng = async () => {
    try {
      const blob = await engineRef.current?.capture()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chroma-field-${selected?.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-') || 'artwork'}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PNG export failed.') }
  }

  const updateControl = (key: keyof ParticleControls, value: number) => setSession((previous) => ({ ...previous, controls: { ...previous.controls, [key]: value } }))
  const timelineDuration = audioMode === 'file' && audioState.duration > 0 ? audioState.duration : 15
  const timelineTime = audioMode === 'file' ? audioState.currentTime : visualTime % 15
  const displayedError = graphicsError ?? error

  return <div className="chroma-field"><div className="app-shell" ref={shellRef}>
    <aside className="left-rail">
      <div className="wordmark" aria-label="Chroma Field"><span>CHROMA</span><span>FIELD</span></div>
      <button className="upload-button" onClick={() => imageInputRef.current?.click()}>
        <Upload size={21} strokeWidth={1.7} /><span><strong>{t('Upload Image')}</strong><small>JPG, PNG, WEBP</small></span>
      </button>
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { onImageFile(event.target.files?.[0]); event.target.value = '' }} />

      <div className="image-collection">
        <div className="rail-label">{t('Current')}</div>
        {selected ? <button className="current-image" title={selected.name} onClick={() => imageInputRef.current?.click()}>
          <img src={selected.url} alt={selected.name} /><span className="image-edit"><ImagePlus size={16} /></span>
        </button> : <button className="empty-image" onClick={() => imageInputRef.current?.click()}><ImagePlus size={21} />{t('Choose an image')}</button>}
        <div className="rail-label history-label">{t('History')} <span>{Math.max(0, images.length - 1).toString().padStart(2, '0')}</span></div>
        <div className="history-list">
          {images.filter((image) => image.id !== selectedId).map((image) => <button key={image.id} className="history-item" title={image.name} onClick={() => setSession((previous) => ({ ...previous, selectedId: image.id }))}>
            <img src={image.url} alt={image.name} />
          </button>)}
          {images.length < 2 && <p className="history-empty">{t('Your images appear here during this session.')}</p>}
        </div>
      </div>

      <div className="rail-bottom">
        <button className="rail-nav is-selected"><ImagePlus size={17} />{t('Canvas')}</button>
        <button className="rail-nav" onClick={() => setDialog('settings')}><Settings2 size={17} />{t('Settings')}</button>
        <button className="rail-nav" onClick={() => setDialog('help')}><CircleHelp size={17} />{t('Help')}</button>
      </div>
    </aside>

    <div className="stage" role="region" aria-label={t('Canvas')} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onImageFile(event.dataTransfer.files[0]) }}>
      <div ref={stageRef} className="canvas-host" />
      <div className="stage-vignette" />
      <div className="interaction-hint"><span>{t('Move cursor')}<br />{t('create a vortex')}</span><em /><span className="mouse-icon"><i /></span><span>{t('Hold left')}<br />{t('pull particles')}</span><em /><span className="mouse-icon right"><i /></span><span>{t('Right click')}<br />{t('burst outward')}</span></div>
      <div className="stage-editorial">{t('PHOTOGRAPHS')}<br />{t('INTO')}<br />{t('NEW REALITIES')}<span /></div>
      <div className="stage-caption"><b />{t('SAME')}<br />{t('IMAGE')}<br />{t('BRIGHTER')}<br />{t('WORLDS')}</div>
      {loading && <div className="stage-message"><div className="loader" />{t('Sampling image pigments…')}</div>}
      {!selected && !loading && <button className="stage-empty" onClick={() => imageInputRef.current?.click()}><ImagePlus size={32} />{t('Drop an image here or click to upload')}</button>}
      {displayedError && <div className="error-toast" role="alert"><span>{t(displayedError)}</span><button onClick={() => { setError(null); setGraphicsError(null) }} aria-label={t('Dismiss error')}><X size={17} /></button>{(displayedError.includes('graphics context') || displayedError.includes('图形上下文')) && <button onClick={() => { setGraphicsError(null); setRendererVersion((value) => value + 1) }}>{t('Retry')}</button>}</div>}
    </div>

    <aside className="inspector">
      <section className="inspector-section palette-section">
        <h2>{t('Image Palette')}</h2>
        <div className="swatches">{(selected?.data.palette ?? ['#185966', '#4fbecb', '#eba442', '#d7ad7a', '#b8667c', '#7c3b65']).slice(0, 6).map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} title={color} />)}</div>
        <p>{t('Extracted from your image')}</p>
      </section>
      <section className="inspector-section controls-section">
        <h2>{t('Particle Controls')}</h2>
        <ControlSlider label={t('Density')} min={0.18} max={1} step={0.01} value={controls.density} onChange={(value) => updateControl('density', value)} />
        <ControlSlider label={t('Image Flow')} min={0} max={1} step={0.01} value={controls.motion} onChange={(value) => updateControl('motion', value)} />
        <p className="control-note">{t('Speed and reach along the image contours. Zero keeps them still.')}</p>
        <ControlSlider label={t('Dispersion')} min={0} max={1} step={0.01} value={controls.dispersion} onChange={(value) => updateControl('dispersion', value)} />
        <ControlSlider label={t('Particle Size')} min={0.5} max={2.4} step={0.01} value={controls.size} onChange={(value) => updateControl('size', value)} />
      </section>
      <section className="inspector-section mode-section">
        <h2>{t('Visual Mode')}</h2>
        <div className="mode-tabs" role="group" aria-label={t('Visual mode')}>{modes.map((mode, index) => <button key={mode} className={controls.mode === index ? 'active' : ''} onClick={() => updateControl('mode', index)}>{t(mode)}</button>)}</div>
      </section>
      <section className="inspector-section audio-section">
        <div className="section-heading"><h2>{t('Audio Reactive')}</h2><button className={`toggle ${audioMode !== 'off' ? 'on' : ''}`} role="switch" aria-checked={audioMode !== 'off'} aria-label={t('Audio reactive')} onClick={toggleAudio}><i /></button></div>
        <label className="field-caption">{t('Audio Source')}</label>
        <div className="audio-source-actions">
          <button className={audioMode === 'file' ? 'chosen' : ''} onClick={() => audioInputRef.current?.click()}><AudioLines size={15} />{t('Audio file')}</button>
          <button className={audioMode === 'microphone' ? 'chosen' : ''} onClick={() => void startMicrophone()}><Mic2 size={15} />{t('Microphone')}</button>
        </div>
        <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(event) => { void onAudioFile(event.target.files?.[0]); event.target.value = '' }} />
        {audioMode === 'file' && <div className="audio-file-row"><button onClick={() => void audioRef.current?.togglePlayback().catch(() => setError('Audio playback could not be started.'))} aria-label={t(audioState.playing ? 'Pause audio' : 'Play audio')}>{audioState.playing ? <Pause size={15} /> : <Play size={15} />}</button><span title={audioState.name}>{audioState.name}</span><span>{timeLabel(audioState.currentTime)}</span></div>}
        {audioMode === 'microphone' && <div className="mic-status"><span /> {t('Microphone is live. Sound is not played back.')}</div>}
        <FrequencyBars levels={audioLevels} active={audioMode !== 'off'} />
        <ControlSlider label={t('Sensitivity')} min={0} max={1} step={0.01} value={sensitivity} onChange={setSensitivity} />
        <ControlSlider label={t('Smoothing')} min={0} max={1} step={0.01} value={smoothing} onChange={setSmoothing} />
      </section>
    </aside>

    <footer className="transport">
      <button className="transport-play" aria-label={t(visualPlaying ? 'Pause animation' : 'Play animation')} onClick={toggleVisual}>{visualPlaying ? <Pause size={22} fill="currentColor" strokeWidth={1} /> : <Play size={22} fill="currentColor" strokeWidth={1} />}</button>
      <span className="timecode">{timeLabel(timelineTime)} <span>/</span> {timeLabel(timelineDuration)}</span>
      <input className="timeline" aria-label={t('Animation timeline')} type="range" min={0} max={timelineDuration} step={0.01} value={Math.min(timelineDuration, timelineTime)} style={{ '--range-progress': `${timelineTime / timelineDuration * 100}%` } as React.CSSProperties} onChange={(event) => { const seconds = Number(event.target.value); if (audioMode === 'file') audioRef.current?.seek(seconds); else { engineRef.current?.seek(seconds); setVisualTime(seconds) } }} />
      <button className="icon-button" aria-label={t('Reset animation')} title="Reset" onClick={reset}><RotateCcw size={19} /></button>
      <button className="icon-button" aria-label={t('Toggle fullscreen')} title="Fullscreen" onClick={() => { if (!document.fullscreenElement) void shellRef.current?.requestFullscreen().then(() => setFullscreen(true)); else void document.exitFullscreen().then(() => setFullscreen(false)) }}><Expand size={19} className={fullscreen ? 'is-fullscreen' : ''} /></button>
      <div className="transport-spacer" />
      <span className="export-format">{t('PNG STILL')}</span>
      <button className="export-button" onClick={() => void exportPng()} disabled={!selected}><ArrowDownToLine size={19} />{t('Export')}</button>
    </footer>

    {dialog && <div className="dialog-backdrop" onClick={() => setDialog(null)}><section className="dialog" role="dialog" aria-modal="true" aria-label={t(dialog === 'settings' ? 'Settings' : 'Help')} onClick={(event) => event.stopPropagation()}>
      <div className="dialog-head"><h2>{t(dialog === 'settings' ? 'Canvas Settings' : 'How to use Chroma Field')}</h2><button onClick={() => setDialog(null)} aria-label={t('Close dialog')}><X size={18} /></button></div>
      {dialog === 'settings' ? <><p>{t('Adjust the live artwork from the panel on the right. Your images stay in this browser session.')}</p><button className="dialog-action" onClick={() => { setSession((previous) => ({ ...previous, controls: { ...initialControls } })); reset(); setDialog(null) }}><SlidersHorizontal size={17} />{t('Restore default controls')}</button></> : <><p>{t('Upload a JPG, PNG, or WebP image. Its pigments and edges become a unique, repeatable particle animation.')}</p><ul><li>{t('Move the cursor over the canvas to create a small vortex.')}</li><li>{t('Hold the left mouse button for a stronger pull.')}</li><li>{t('Right click to push nearby particles outward. They settle back into the image.')}</li><li>{t('Image Flow changes the speed and reach of contour motion.')}</li><li>{t('Choose a song or microphone to make the image respond to sound.')}</li><li>{t('Use Export to download the current frame as a PNG.')}</li></ul></>}
    </section></div>}
  </div></div>
}

export default App
