import data from './projects.json';
import teamData from './team.json';
import mediaData from './media.json';
import type { Project,TeamContent,ProjectMedia } from './types';
import { localizeProject } from './project-en';
import type { Language } from '../language';
export const projects=data as unknown as Project[];
export const team=teamData as TeamContent;
export const allMedia=mediaData as ProjectMedia[];
export const homeProjects=projects.filter(p=>p.homeOrder>=0).sort((a,b)=>a.homeOrder-b.homeOrder);
export const categories=['文化艺术','城市景观','历史保护','商业办公','体育建筑','交通教育','沉浸体验'];
export function filterProjects(query:string,category:string,featured:boolean,language:Language='zh'){
  const q=query.trim().toLocaleLowerCase();
  return projects.filter(p=>{
    if(featured&&!p.featured)return false;
    if(category&&!p.categories.includes(category))return false;
    if(!q)return true;
    const localized=localizeProject(p,language);
    return `${p.name} ${p.fullName} ${p.city} ${p.english} ${p.categories.join(' ')} ${localized.name} ${localized.city} ${localized.categories.join(' ')}`.toLocaleLowerCase().includes(q);
  });
}
