import type { LabState,PixelPattern } from '../content/types';
export const initialLab:LabState={intensity:65,color:'#ffe4b6',position:[.72,.32],pattern:'wave',speed:50,paused:false};
export type LabAction={type:'reset'}|{type:'intensity'|'speed';value:number}|{type:'color';value:string}|{type:'position';value:[number,number]}|{type:'pattern';value:PixelPattern}|{type:'pause'};
export const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export function labReducer(s:LabState,a:LabAction):LabState{switch(a.type){case 'reset':return {...initialLab,position:[...initialLab.position]};case 'intensity':case 'speed':return {...s,[a.type]:clamp(a.value)};case 'color':return {...s,color:a.value};case 'position':return {...s,position:[clamp(a.value[0],.05,.95),clamp(a.value[1],.05,.95)]};case 'pattern':return {...s,pattern:a.value};case 'pause':return {...s,paused:!s.paused};}}
