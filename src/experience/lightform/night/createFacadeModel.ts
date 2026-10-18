// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import {optimizeArchitecture} from './architectureOptimization';
import specification from './specs/facade.json';
import {createArchitectureBlockout,addArchitectureStructure,addArchitectureForm} from './architectureGeometry';
import {addArchitectureMaterials} from './architectureMaterials';
import {addArchitectureSurface} from './architectureSurface';
export const facadeBuiltPass='optimization-pass';
import {addArchitectureRuntime} from './architectureRuntime';
export function createFacadeModel(){return optimizeArchitecture(addArchitectureRuntime(addArchitectureSurface(addArchitectureMaterials(addArchitectureForm(addArchitectureStructure(createArchitectureBlockout(specification,'facade')))))));}
