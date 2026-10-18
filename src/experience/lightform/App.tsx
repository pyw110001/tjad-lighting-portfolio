import type { ParticleFieldSession } from '../particles/session';
import StudioWorkbench from './StudioWorkbench';
import { SceneStudio } from './SceneStudio';
import type { StudioFactory } from './studioTypes';
import type { ChromaSession } from '../chroma/session';
import type { FluidLightState } from '../labState';
import type { LabMediaSession } from './mediaSession';

const createStudio: StudioFactory = (host, ready, error, pointer) => new SceneStudio(host, ready, error, pointer);
export default function App(props: { chromaSession: ChromaSession; fluidSettings: FluidLightState; mediaSession: LabMediaSession; particleSession: ParticleFieldSession }) {
  return <StudioWorkbench {...props} createStudio={createStudio} />;
}