// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import {optimizeArchitecture} from './architectureOptimization';
import specification from './specs/hive.json';
import {createArchitectureBlockout,addArchitectureStructure,addArchitectureForm} from './architectureGeometry';
import {addArchitectureMaterials} from './architectureMaterials';
import {addArchitectureSurface} from './architectureSurface';
export const hiveBuiltPass='optimization-pass';
import {addArchitectureRuntime} from './architectureRuntime';
export function createHiveModel(){return optimizeArchitecture(addArchitectureRuntime(addArchitectureSurface(addArchitectureMaterials(addArchitectureForm(addArchitectureStructure(createArchitectureBlockout(specification,'hive')))))));}
