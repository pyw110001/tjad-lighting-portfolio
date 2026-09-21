import { describe,expect,it } from 'vitest';
import { categories,filterProjects,homeProjects,projects } from './index';
describe('project content',()=>{
 it('contains the audited project sets',()=>{expect(projects).toHaveLength(29);expect(projects.filter(p=>p.featured)).toHaveLength(11);expect(homeProjects).toHaveLength(6);});
 it('has stable unique slugs and usable images',()=>{expect(new Set(projects.map(p=>p.slug)).size).toBe(29);for(const p of projects){expect(p.name).toBeTruthy();expect(p.cover.src).toMatch(/^\/assets\/projects\//);expect(p.gallery.length).toBeGreaterThan(0);expect(p.sourceYear).toBe(2023);}});
  it('supports category, featured and text filtering',()=>{
    expect(filterProjects('',categories[0],false).every(p=>p.categories.includes(categories[0]))).toBe(true);
    expect(filterProjects('', '',true)).toHaveLength(11);
    expect(filterProjects('浦东美术馆','',false).map(p=>p.id)).toEqual([2]);
    expect(filterProjects('沉浸','',false).map(p=>p.id)).toContain(29);
  });
  it('keeps known OCR conflicts out of displayed facts',()=>{
    expect(projects.find(p=>p.id===19)?.facts['项目规模']).toBeUndefined();
    expect(projects.find(p=>p.id===19)?.rawFacts['项目规模']).toBeTruthy();
    const p8 = projects.find(p=>p.id===8);
    expect(p8?.city).toBe('杭州市');
    expect(p8?.year).toBe('2016年');
    expect(p8?.facts['项目获奖']).toBe('2017 IES AWARD');
    expect(p8?.rawFacts['所在城市']).toContain('2017IESAWARD');
  });
});
