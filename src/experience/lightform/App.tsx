import StudioWorkbench from './StudioWorkbench';
import { SceneStudio } from './SceneStudio';
import type { StudioFactory } from './studioTypes';
import type { ChromaSession } from '../chroma/session';
import type { FluidLightState } from '../labState';
import type { LabMediaSession } from './mediaSession';

const createStudio: StudioFactory = (host, ready, error) => new SceneStudio(host, ready, error);
export default function App(props: { chromaSession: ChromaSession; fluidSettings: FluidLightState; mediaSession: LabMediaSession }) {
  return <StudioWorkbench {...props} createStudio={createStudio} />;
}