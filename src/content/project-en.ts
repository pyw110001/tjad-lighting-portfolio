import type { Project, ProjectMedia } from './types';
import type { Language } from '../language';

type EnglishProject = {
  name: string;
  summary: string;
  analysis?: string[];
  architect?: string;
  client?: string;
  type?: string;
  area?: string;
  date?: string;
  awards?: string;
  note?: string;
  sceneCreator?: string;
  sceneDesigner?: string;
};

const firm = 'Tongji Architectural Design (Group) Co., Ltd.';

export const categoryEnglish: Record<string, string> = {
  '文化艺术': 'Culture & Art',
  '城市景观': 'Urban & Landscape',
  '历史保护': 'Heritage',
  '商业办公': 'Commercial & Workplace',
  '体育建筑': 'Sports Architecture',
  '交通教育': 'Transport & Education',
  '沉浸体验': 'Immersive Experience'
};

const cityEnglish: Record<string, string> = {
  '上海市': 'Shanghai', '扬州市': 'Yangzhou', '宜兴市': 'Yixing',
  '高邮市': 'Gaoyou', '杭州市': 'Hangzhou', '拉萨市': 'Lhasa',
  '泉州市': 'Quanzhou', '合肥市': 'Hefei', '南通市': 'Nantong',
  '深圳市': 'Shenzhen', '南京市': 'Nanjing', '宁波市': 'Ningbo',
  '桐乡市': 'Tongxiang', '厦门市': 'Xiamen', '广州市': 'Guangzhou',
  '台州市': 'Taizhou', '景德镇市': 'Jingdezhen'
};

const english: Record<string, EnglishProject> = {
  'the-bund': {
    name: 'The Bund Historic Buildings Lighting Renewal',
    summary: 'Architectural lighting renewal for the historic Bund buildings, including overall coordination and work on Bund Nos. 14 and 29. Commissioned by the Huangpu District Lighting Office in Shanghai; design began in 2018.',
    architect: 'Tonghe & Co.; Hungarian architect Laszlo Hudec', client: 'Huangpu District Lighting Office',
    type: 'Protected historic buildings', date: 'Designed in 2018',
    awards: '2021 IDA International Design Awards Silver; 2020 IES Award of Merit; 2020 IALD Award of Merit; 2019 Shanghai Magnolia Lighting Award of Merit'
  },
  'museum-of-art-pudong': {
    name: 'Museum of Art Pudong',
    summary: 'Architectural, landscape and interior lighting for the Museum of Art Pudong. Designed by Ateliers Jean Nouvel and TJAD for Shanghai Lujiazui Group, the 42,000 m² museum was completed in 2021. Its riverside position faces the historic Bund.',
    architect: `Ateliers Jean Nouvel; ${firm}`, client: 'Shanghai Lujiazui Group',
    type: 'Art museum', area: '42,000 m² total; approx. 26,000 m² above ground', date: 'Completed in 2021',
    analysis: [
      'Architecture as a luminous object: the facade communicates the building’s mass at night and becomes a distinct node on the Lujiazui waterfront, in dialogue with the warm lighting of the Bund.',
      'LED media facade: large LED media glass surfaces allow the building envelope to carry art content at an urban scale, beyond simply illuminating its exterior.',
      'White-box galleries: high color rendering, low glare and even overhead light support the display of artworks; the portfolio images show a notably clean diffuse effect.',
      'Integrated lighting: exterior massing, riverside landscape and exhibition spaces use a coordinated hierarchy of brightness and color temperature.'
    ]
  },
  'shanghai-concert-hall': {
    name: 'Shanghai Concert Hall Restoration',
    summary: 'Interior lighting design for the restoration of Shanghai Concert Hall. The performing arts project was designed in 2018 for Shanghai Concert Hall.',
    architect: `Xu Feng Studio; ${firm}`, client: 'Shanghai Concert Hall',
    type: 'Performing arts venue', date: 'Designed in 2018', awards: '2021 China Lighting Award, First Prize for Interior Lighting'
  },
  'wanping-theatre': {
    name: 'Wanping Theatre',
    summary: 'Interior and exterior architectural lighting for Wanping Theatre, a cultural performance venue of approximately 25,000 m² above ground. Designed in 2018 for the Shanghai Chinese Opera Center; recipient of a 2021 Shanghai Magnolia outdoor lighting silver award.',
    architect: `Professor Xu Feng’s team; Third Design Institute of ${firm}`, client: 'Shanghai Chinese Opera Center',
    type: 'Cultural performance venue', area: 'Approx. 25,000 m² above ground', date: 'Designed in 2018',
    awards: '2021 Shanghai Magnolia Lighting Award, Silver for Outdoor Lighting',
    analysis: [
      'The exterior media facade extends the theatre’s cultural expression into the street through a large LED display.',
      'A dense field of point lights forms a “starry sky” ceiling in the auditorium, paired with reddish-brown wood for an immersive theatrical atmosphere.',
      'Continuous curved ceilings and linear wall washing guide visitors through the lobby and reveal the building’s freeform surfaces.',
      'Distinct lighting scenes for performances, arrival, departure and cleaning balance the audience experience with operation.'
    ]
  },
  'yangzhou-grand-theatre': {
    name: 'Yangzhou Grand Canal Theatre',
    summary: 'Interior lighting for the Yangzhou Grand Canal Theatre, covering approximately 16,000 m². Commissioned by Yangzhou Cultural Investment Management Co., Ltd.; designed in 2019 while the project was under construction.',
    architect: `Third Design Institute of ${firm}`, client: 'Yangzhou Cultural Investment Management Co., Ltd.',
    type: 'Performing arts venue', area: 'Approx. 16,000 m² of interior lighting', date: 'Designed in 2019 (under construction at the time)'
  },
  'yada-theatre': {
    name: 'Yada Yangxian Xishan Theatre',
    summary: 'Architectural, landscape and interior lighting for the Yada Yangxian Xishan Theatre in Yixing. Designed in 2020 for Yada Yixing Real Estate.',
    architect: 'GOA', client: 'Yada Yixing Real Estate', type: 'Performing arts venue', date: 'Designed in 2020'
  },
  'wang-zengqi-memorial': {
    name: 'Wang Zengqi Memorial Hall',
    summary: 'Architectural, landscape and interior lighting for the Wang Zengqi Memorial Hall in Gaoyou. The exhibition building has approximately 10,000 m² of total floor area; design began in 2019.',
    architect: firm, client: 'Gaoyou Municipal Government', type: 'Exhibition building',
    area: 'Approx. 10,000 m² total; 5,000 m² above ground', date: 'Designed in 2019',
    awards: '2021 MUSE Creative Awards Platinum for Architectural Lighting; 2021 A’ Design Award Silver for Architectural Lighting'
  },
  'china-silk-museum': {
    name: 'China National Silk Museum',
    summary: 'Facade lighting for the China National Silk Museum in connection with the G20 summit. The museum in Hangzhou has approximately 15,000 m² above ground and 8,000 m² below ground; work was completed in 2016.',
    architect: `Li Li (Ruoben Architecture Studio); ${firm}`, client: 'China National Silk Museum',
    type: 'Museum', area: 'Approx. 15,000 m² above ground; 8,000 m² below ground',
    date: 'Completed in 2016', awards: '2017 IES Award',
    note: 'An OCR error mixed award text into the city field; the displayed city was corrected to Hangzhou. The original source is retained.'
  },
  'tibet-art-museum': {
    name: 'Tibet Art Museum',
    summary: 'Lighting project for the Tibet Art Museum in Lhasa. The museum has a total floor area of approximately 36,700 m², including 27,500 m² above ground; design began in 2020.',
    architect: firm, client: 'Tibet Art Museum', type: 'Art museum',
    area: 'Approx. 36,700 m² total; 27,500 m² above ground', date: 'Designed in 2020'
  },
  'quanzhou-cultural-center': {
    name: 'Quanzhou Public Cultural Center',
    summary: 'Architectural lighting for the Quanzhou Public Cultural Center, a multi-building cultural complex with 324,800 m² of total floor area. Commissioned by Quanzhou Donghai Investment Management in 2018.',
    architect: firm, client: 'Quanzhou Donghai Investment Management Co., Ltd.',
    type: 'Cultural complex', area: '324,800 m² total; approx. 135,300 m² above ground', date: 'Designed in 2018',
    awards: '2021 IDA Silver; 2021 China Lighting Award, Second Prize for Outdoor Lighting; 2020 Asia Lighting Design Award; 2019 Shanghai Magnolia Bronze',
    analysis: [
      'The envelope as a medium: point lights concealed in the woven facade produce a pixelated surface capable of changing patterns.',
      'The portfolio shows geometric light and dark patterns across the facade, giving the architecture a changing nighttime expression.',
      'A lighting hierarchy across the library, theatre and other buildings preserves their distinct roles and prevents excessive overall brightness.',
      'Brightness and reflections were considered together for the complex’s waterside setting.'
    ]
  },
  'hefei-art-museum': {
    name: 'Hefei Art Museum',
    summary: 'Architectural, landscape and interior lighting for Hefei Art Museum. The project totals approximately 36,000 m², including 16,000 m² above ground; the design dates to 2019–2020.',
    architect: firm, client: 'Hefei Art Museum', type: 'Art museum',
    area: 'Approx. 36,000 m² total; 16,000 m² above ground', date: 'Designed in 2019–2020',
    analysis: [
      'Warm light washes the curved metal exterior to reveal the building’s form and apparent weightlessness while retaining material detail.',
      'A luminous artwork in the atrium makes light itself the focal point of the public space.',
      'Diffuse, high-rendering gallery light supports exhibits, while public spaces allow a more expressive treatment of color and brightness.',
      'Lighting at the transparent ground floor and rooftop courtyard gives the museum an open civic presence after dark.'
    ]
  },
  'nantong-cultural-center': {
    name: 'Nantong Development Zone Public Cultural Center',
    summary: 'Lighting for the Nantong Development Zone Public Cultural Center. The cultural building totals approximately 32,000 m², with about 25,000 m² above ground; design began in 2018.',
    architect: firm, client: 'Nantong Daneng Company', type: 'Cultural building',
    area: 'Approx. 32,000 m² total; 25,000 m² above ground', date: 'Designed in 2018',
    awards: '2021 MUSE Creative Awards Platinum; 2021 A’ Design Award Silver; 2021 IES Award of Merit'
  },
  'maozhou-river': {
    name: 'Maozhou River Greenway Renewal',
    summary: 'Landscape, architectural, interior and bridge lighting for the Maozhou River greenway renewal in Shenzhen. Commissioned by the Shenzhen Water Authority; design began in 2019.',
    client: 'Shenzhen Water Authority', type: 'Municipal landscape and exhibition facilities', date: 'Designed in 2019',
    awards: '2021 MUSE Creative Awards Gold; 2021 A’ Design Award Silver; 2021 IES Award of Merit; 2021 China Lighting Award, Third Prize for Outdoor Lighting; 2021 Shanghai Magnolia Silver'
  },
  'yihe-quarter': {
    name: 'Yihe Historic Quarter 11',
    summary: 'Architectural and landscape lighting for the commercial renewal of Yihe Historic Quarter 11 in Nanjing. The 3,511 m² above-ground project was completed in 2021 within a low-rise historic neighborhood.',
    architect: `Chang Qing Studio; ${firm}`, client: 'Nanjing Yihe Historic Preservation Co., Ltd.',
    type: 'Commercial historic quarter', area: '3,511 m² above ground', date: 'Completed in 2021',
    analysis: [
      'Restrained brightness: low levels, warm color temperature and localized accents retain the material character of the historic buildings.',
      'A colorful LED pixel wall along the street provides a contemporary art moment within the otherwise restrained lighting scheme.',
      'Purple-red light on selected trees creates neighborhood-scale color markers against the warm background.',
      'Shop windows, courtyard lights and in-ground fixtures shape the pedestrian experience rather than a distant skyline view.'
    ]
  },
  'century-square': {
    name: 'Century Square, Nanjing East Road',
    summary: 'Lighting for the renewal of Century Square on Shanghai’s Nanjing East Road pedestrian street. Designed in 2020 with EMBT for Shanghai New World Group, the central sunken circular plaza sits within one of the city’s busiest public spaces.',
    architect: `EMBT; ${firm}`, client: 'Shanghai New World Group', type: 'Public square renewal', date: 'Designed in 2020',
    analysis: [
      'The “light container” concept keeps surrounding facades subdued and gives the central sunken square the role of a stage for light and color.',
      'Programmable color across the circular ground plane creates changing environments, from cool violet to warm white and multicolor gradients.',
      'Brightness and color temperature are coordinated with the historic buildings along Nanjing East Road.',
      'Shielding and zoning help contain glare and spill from dense commercial signs around the plaza.'
    ]
  },
  'alibaba-nanjing': {
    name: 'Alibaba Nanjing Headquarters',
    summary: 'Facade lighting for Alibaba’s Nanjing headquarters complex, an 850,000 m² mix of office towers, retail and public courtyards. Designed by Benoy and TJAD; the 2023 portfolio lists construction as ongoing.',
    architect: `Benoy; ${firm}`, client: 'Alibaba Group', type: 'Offices, corporate headquarters and retail',
    area: '850,000 m² total; approx. 555,000 m² above ground', date: 'Under construction in the 2023 portfolio',
    analysis: [
      'Programmable colored pixels across the retail facade carry the company’s digital identity and create a visual focus for the campus.',
      'Office towers, retail streets and shared courtyards use separate brightness and color-temperature zones across the vast complex.',
      'Linear ground lights and illuminated shop interiors guide pedestrian movement after dark.',
      'Restrained tower lighting maintains skyline order while the lower retail levels support a more active expression.'
    ]
  },
  'ningbo-cultural-port': {
    name: 'Ningbo Cultural and Creative Port',
    summary: 'Facade and landscape lighting for the first phase of Ningbo Cultural and Creative Port, a 448,784 m² mixed-use district with retail, offices and housing. Design work ran from 2020 to 2022.',
    architect: `Wu Zhiqiang team; ${firm}`, client: 'Ningbo Cultural and Creative Port Group',
    type: 'Retail, offices and housing', area: '448,784 m² total; approx. 277,862 m² above ground', date: 'Designed in 2020–2022'
  },
  'china-mobile-nanjing': {
    name: 'China Mobile Nanjing Innovation Center',
    summary: 'Facade and landscape lighting for the China Mobile Yangtze River Delta Innovation Center in Nanjing. The office headquarters project totals 341,449 m²; the 2023 portfolio records it as still in design.',
    architect: `Schmidt Hammer Lassen; ${firm}`, client: 'China Mobile', type: 'Offices and corporate headquarters',
    area: '341,449 m² total; approx. 246,137 m² above ground', date: 'In design in the 2023 portfolio'
  },
  'iflytek-campus': {
    name: 'iFLYTEK AI Research and Production Campus',
    summary: 'Facade, landscape and interior lighting for Phase One of iFLYTEK’s AI research and production campus in Hefei. Design began in 2022.',
    architect: 'line+ studio', client: 'iFLYTEK', type: 'Offices and corporate headquarters', date: 'Designed in 2022',
    note: 'The total and above-ground area figures in the source OCR conflict. The area is omitted here; the original source remains available.'
  },
  'tongkun-headquarters': {
    name: 'Tongkun Group Headquarters',
    summary: 'Facade and landscape lighting for Tongkun Group’s dual-tower headquarters in Tongxiang. The above-ground area is approximately 79,000 m²; the 2023 portfolio lists construction as ongoing.',
    architect: `First Design Institute of ${firm}`, client: 'Tongkun Group',
    type: 'Office, hotel and corporate headquarters', area: 'Approx. 79,000 m² above ground',
    date: 'Under construction in the 2023 portfolio',
    analysis: [
      'Addressable window-grid pixels create large colored patterns across the two tower facades, making them a changeable corporate image surface.',
      'Brightness and color differ between the two towers to keep each volume legible at night.',
      'Light distribution considers the completeness of the buildings’ reflections in adjacent water.',
      'High-illuminance, high-rendering accents at the canopy and lobby establish a ceremonial entrance.'
    ]
  },
  'cnnc-shanghai': {
    name: 'CNNC Shanghai Headquarters',
    summary: 'Architectural, landscape and interior lighting for China National Nuclear Corporation’s Shanghai headquarters. The mixed office and retail complex totals approximately 110,000 m²; design began in 2019.',
    architect: firm, client: 'China National Nuclear Corporation', type: 'Offices, headquarters and retail',
    area: 'Approx. 110,000 m² total; 66,000 m² above ground', date: 'Designed in 2019'
  },
  'bytedance-xiamen': {
    name: 'ByteDance Xiamen Office',
    summary: 'Lighting for ByteDance’s approximately 60,000 m² office building in Xiamen. Designed by CAN Design for Xiamen Vector Space Technology in 2021.',
    architect: 'CAN Design', client: 'Xiamen Vector Space Technology Co., Ltd.',
    type: 'Office building', area: 'Approx. 60,000 m² design area', date: 'Designed in 2021',
    analysis: [
      'Large LED media walls at the entrance and atrium carry pixel-based brand visuals through the public ground floor.',
      'A soft wash across the atrium ceiling establishes spatial height, while task lighting keeps work areas comfortable.',
      'Office, visitor, event and night-duty scenes coordinate media content with ambient lighting.',
      'Low-saturation colored light gently differentiates the cafe and shared spaces without hard partitions.'
    ]
  },
  'roche': {
    name: 'Roche Pharmaceuticals Office',
    summary: 'Office lighting for Roche Pharmaceuticals in Shanghai, covering approximately 3,000 m². Design began in 2019.',
    architect: firm, client: 'Roche Pharmaceuticals', type: 'Office building',
    area: 'Approx. 3,000 m² design area', date: 'Designed in 2019'
  },
  'qianshao-hotel': {
    name: 'Qianshao Farm Boutique Hotel',
    summary: 'Landscape, architectural and interior lighting for the conversion of Qianshao Farm into a boutique hotel and exhibition destination in Shanghai. Designed in 2020 for Bright Food Group.',
    architect: 'Original Works Studio, TJAD', client: 'Bright Food Group', type: 'Hotel and exhibition building', date: 'Designed in 2020'
  },
  'iff-nansha': {
    name: 'IFF Nansha Permanent Venue',
    summary: 'Landscape and architectural lighting for the International Finance Forum’s permanent venue in Nansha, Guangzhou, comprising conference, hotel and residential functions. Designed in 2020.',
    architect: firm, client: 'Guangzhou Gecheng Industrial Co., Ltd.', type: 'Conference and exhibition building', date: 'Designed in 2020',
    note: 'An OCR fragment was mixed into the source city field; the displayed city was corrected to Guangzhou. The original source is retained.'
  },
  'taizhou-airport': {
    name: 'Taizhou Luqiao Airport',
    summary: 'Transport lighting for Taizhou Luqiao Airport. Designed in 2020 for the airport operator.',
    architect: `${firm}; Shanghai New Era Airport Design & Research Institute`,
    client: 'Taizhou Luqiao Airport', type: 'Transport building', date: 'Designed in 2020'
  },
  'fuliang-sports-center': {
    name: 'Fuliang Sports Center, Jingdezhen',
    summary: 'Architectural lighting for the 27,000 m² Fuliang Sports Center, completed in 2018. Its elliptical bowl-like form refers to Jingdezhen’s ceramic culture.',
    architect: `Urban Design Institute of ${firm}`, type: 'Sports building',
    area: '27,000 m² total; approx. 18,000 m² above ground', date: 'Completed in 2018',
    analysis: [
      'LED points in the perforated metal skin turn the idea of porcelain into a dotted, glaze-like nighttime light language.',
      'Portfolio images show programmed pink and cyan point patterns across the facade at different moments.',
      'A low-brightness everyday mode can shift to a more dynamic presentation for sport and performance events.',
      'Warm linear light at the base anchors the bowl and contrasts with the colored pixels above.'
    ]
  },
  'ustc': {
    name: 'University of Science and Technology of China',
    summary: 'Lighting master planning plus architectural and landscape lighting for the University of Science and Technology of China in Hefei. The source records a project area of 713,850 m² and a 2018 design date.',
    architect: `Fourth Design Institute of ${firm}`, client: 'University of Science and Technology of China',
    type: 'Educational buildings', area: '713,850 m² project area', date: 'Designed in 2018'
  },
  'ghibli-world': {
    name: 'The Art of Ghibli World',
    summary: 'Lighting consultancy for a Shanghai exhibition of Studio Ghibli worlds, covering approximately 500 m². Full-scale scenes based on films including My Neighbor Totoro and Spirited Away needed to evoke the originals’ color and atmosphere while keeping exhibits legible and visitors comfortable. The exhibition was completed in 2018.',
    sceneCreator: 'Studio Ghibli', sceneDesigner: 'Japanese design team',
    client: 'SCLA Cultural Development Co., Ltd.', type: 'Immersive exhibition', area: 'Approx. 500 m² exhibition area', date: 'Completed in 2018',
    analysis: [
      'Day and night lighting states give the same physical scene a sense of time; the Totoro forest sequence is the clearest example in the portfolio.',
      'Fixtures are concealed in planting, architectural elements and props. Indirect light, wall washing and point sources preserve the feeling of entering an animated world.',
      'Color temperature and rendering are tuned to recover the warm orange, blue-green and pink-violet palette of the original imagery.',
      'Changes in illuminance and color temperature organize the visitor route and create transitions between scenes.',
      'Exhibition standards for illuminance, glare and color rendering are balanced with the desired atmosphere.'
    ]
  }
};

function englishFacts(project: Project, copy: EnglishProject) {
  const facts: Record<string, string> = {};
  if (copy.sceneCreator) facts['Scene creator'] = copy.sceneCreator;
  if (copy.sceneDesigner) facts['Scene design'] = copy.sceneDesigner;
  if (copy.architect) facts.Architect = copy.architect;
  if (copy.client) facts.Client = copy.client;
  if (copy.type) facts.Typology = copy.type;
  if (copy.area) facts.Area = copy.area;
  if (copy.date) facts['Project date'] = copy.date;
  facts.City = cityEnglish[project.city] || project.city;
  if (copy.awards) facts.Awards = copy.awards;
  return facts;
}

function englishMedia(media: ProjectMedia, name: string, index: number): ProjectMedia {
  return {
    ...media,
    kind: media.kind.includes('实景') ? 'Built view' : media.kind.includes('版面') ? 'Portfolio page' : 'Design visualization',
    alt: `${name} — image ${index + 1}`
  };
}

export function localizeProject(project: Project, language: Language): Project {
  if (language === 'zh') return project;
  const copy = english[project.slug];
  if (!copy) return project;
  return {
    ...project,
    name: copy.name,
    fullName: copy.name,
    city: cityEnglish[project.city] || project.city,
    categories: project.categories.map(category => categoryEnglish[category] || category),
    summary: copy.summary,
    analysis: copy.analysis || [],
    facts: englishFacts(project, copy),
    note: copy.note || '',
    cover: englishMedia(project.cover, copy.name, 0),
    gallery: project.gallery.map((media, index) => englishMedia(media, copy.name, index)),
    reference: project.reference ? englishMedia(project.reference, copy.name, 0) : undefined
  };
}

export function englishProjectName(slug: string) {
  return english[slug]?.name;
}
