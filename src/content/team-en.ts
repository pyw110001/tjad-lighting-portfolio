import { team } from './index';
import type { TeamContent } from './types';
import type { Language } from '../language';

const english: TeamContent = {
  ...team,
  name: 'TJAD Architectural Lighting Studio',
  fullName: 'Tongji Architectural Design (Group) Co., Ltd.',
  department: 'Specialized Technology Division · Architectural Lighting Studio',
  philosophy: 'We take architectural space as our primary subject and design around the visual and psychological experience of its users.',
  intro: 'Rooted in Tongji University and Tongji Design Group, the studio provides specialist lighting consultancy to architects, clients and in-house teams. Every project begins with its purpose and needs; light then shapes the experience of place.',
  director: 'Yang Xiu',
  directorRole: 'PhD · Director, Architectural Lighting Studio',
  directorBio: 'A nationally certified senior lighting designer and architect, Yang Xiu was a scientist at Philips Research China. Her work spans visual arts and performance, light and health, architectural lighting, and urban light environments.',
  awardNames: ['IALD', 'IES', 'IDA', 'A’ Design Award', 'MUSE', 'China Lighting Award', 'Shanghai Magnolia Lighting Design Award'],
  services: [
    { title: 'Design', items: ['Urban lighting planning and design', 'Architectural lighting design', 'Landscape lighting design', 'Interior lighting design', 'Luminaire design'] },
    { title: 'Consultancy', items: ['Lighting applications and products', 'Lighting strategy', 'Post-occupancy evaluation of interior and exterior lighting', 'Daylight analysis', 'Nighttime light pollution assessment'] },
    { title: 'Research', items: ['Applied lighting research', 'Effects of materials on lighting', 'Lighting and spatial experience', 'Light and health', 'Lighting and emotional response'] }
  ]
};

export function localizeTeam(language: Language): TeamContent {
  return language === 'en' ? english : team;
}
