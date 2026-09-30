import type { ParticleData } from './imageAnalysis'
import type { ParticleControls } from './particleEngine'

export type ChromaImage = { id: string; name: string; url: string; data: ParticleData; demo?: boolean }

export type ChromaSession = {
  images: ChromaImage[]
  selectedId: string | null
  controls: ParticleControls
  visualPlaying: boolean
}

export const initialChromaSession: ChromaSession = {
  images: [],
  selectedId: null,
  controls: { density: 0.72, motion: 0.58, dispersion: 0.4, size: 1.2, mode: 0 },
  visualPlaying: true,
}
