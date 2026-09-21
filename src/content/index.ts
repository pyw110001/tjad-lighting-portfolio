import data from './projects.json';
import teamData from './team.json';
import mediaData from './media.json';
import type { Project,TeamContent,ProjectMedia } from './types';
export const projects=data as unknown as Project[];
export const team=teamData as TeamContent;
export const allMedia=mediaData as ProjectMedia[];
export const homeProjects=projects.filter(p=>p.homeOrder>=0).sort((a,b)=>a.homeOrder-b.homeOrder);
export const categories=['文化艺术','城市景观','历史保护','商业办公','体育建筑','交通教育','沉浸体验'];
export function filterProjects(query:string,category:string,featured:boolean){ const q=query.trim().toLocaleLowerCase(); return projects.filter(p=>(!featured||p.featured)&&(!category||p.categories.includes(category))&&(!q||`${p.name} ${p.fullName} ${p.city} ${p.english}`.toLocaleLowerCase().includes(q))); }
