import StudioWorkbench from '../lightform/StudioWorkbench';
import { PhotoStudio } from './PhotoStudio';
import type { StudioFactory } from '../lightform/studioTypes';
import type { ChromaSession } from '../chroma/session';
import type { FluidLightState } from '../labState';
import type { LabMediaSession } from '../lightform/mediaSession';
import './styles.css';
const createStudio: StudioFactory = (host, ready, error, pointer) => new PhotoStudio(host, ready, error, pointer);
export default function App(props: { chromaSession: ChromaSession; fluidSettings: FluidLightState; mediaSession: LabMediaSession }) {
  return <StudioWorkbench {...props} createStudio={createStudio} photo />;
}
