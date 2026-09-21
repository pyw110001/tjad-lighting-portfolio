import { useEffect,useState } from 'react';
import type { RefObject } from 'react';
export function useActivity(ref:RefObject<HTMLElement|null>){const [active,setActive]=useState(true);useEffect(()=>{let inView=true;const update=()=>setActive(inView&&!document.hidden);const io=new IntersectionObserver(e=>{inView=e[0].isIntersecting;update();});if(ref.current)io.observe(ref.current);document.addEventListener('visibilitychange',update);return()=>{io.disconnect();document.removeEventListener('visibilitychange',update);};},[ref]);return active;}
export function canWebGL(){try{const c=document.createElement('canvas');const gl=c.getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
