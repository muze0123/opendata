import type { Regulation } from '../../regulations/data/regulations';
export const LEVEL_CODES = ['qm', 'asilA', 'asilB', 'asilC', 'asilD'] as const;
export const DEVELOPMENT_CODES = ['internal', 'purchased', 'joint'] as const;
export const SCAN_CODES = ['unconfigured', 'queued', 'failed', 'available'] as const;
export interface SbomComponent { id: string; componentCode: string; componentName: string; componentVersion: string; componentSource: string }
export interface SoftwareVersion {
  id: string;
  name: string;
  interfaces: string[];
  protocols: string[];
  scan: typeof SCAN_CODES[number];
  fileName: string;
  method?: 'json' | 'firmware';
  components?: SbomComponent[];
  progress?: number;
}
export interface HardwareVersion { id: string; name: string; note: string; software: SoftwareVersion[] }
// 关联数据由模块持有，HMG 项目接口接入前使用此类型承接数据。
export interface PartRelatedProject {
  id: string;
  code: string;
  name: string;
  brand: string;
  series: string;
  model: string;
  priority: 'high' | 'medium' | 'low';
  status: 'planning' | 'active' | 'completed';
}
export interface Part {
  approval?: { decision: 'approved' | 'rejected'; opinion: string }; 
  id: string; code: string; name: string; abbreviation: string;
  level: typeof LEVEL_CODES[number] | ''; development: typeof DEVELOPMENT_CODES[number] | '';
  supplier: string; material: string; ip: string; owner: string; securityOwner: string;
  hardware: HardwareVersion[];
  regulationCode?: string;
  region?: string;
  versionDevelopment?: string;
  status?: string;
  relatedProjects?: PartRelatedProject[];
  relatedRegulations?: Regulation[];
}
export type Segment = { id: string; kind: 'fixed' | 'variable' | 'year'; value: string };
export const suppliers = ['博世汽车部件', '大陆集团', '电装中国'];
export const INTERFACE_CODES = ['CAN0', 'ETH1', 'LIN0'];
export const PROTOCOL_CODES = ['UDS', 'DoIP'];
export function emptyPart(): Part {
  return { id: '', code: '', name: '', abbreviation: '', level: '', development: '', supplier: '', material: '', ip: '', owner: '', securityOwner: '', hardware: [] };
}

/**
 * 零部件目录种子（基础数据库零部件库的最小可用集合）。
 * 目录编辑器依赖基础库作为可选零部件来源；当 partsStore.rows 尚未被用户导入/创建
 * （例如在车型车辆路由下进入编辑器、部件库为空）时，回退到此种子，保证交互可演示。
 * 不影响部件页的引导态（其 `initialized`/空行判断与此无关）。
 */
export interface PartCatalogSeed { id: string; code: string; name: string; abbreviation: string; supplier: string }
export const partCatalogSeed: PartCatalogSeed[] = [
  { id: 'PN-DCU-A01', code: 'PN-DCU-A01', name: '域控制器总成', abbreviation: '', supplier: '华为' },
  { id: 'PN-GW-B02', code: 'PN-GW-B02', name: '网关', abbreviation: 'GW', supplier: '博世' },
  { id: 'PN-TBOX-C03', code: 'PN-TBOX-C03', name: 'TBOX', abbreviation: '', supplier: '大陆' },
  { id: 'PN-IVI-D04', code: 'PN-IVI-D04', name: '车机', abbreviation: 'IVI', supplier: '德赛西威' },
  { id: 'PN-CDC-E01', code: 'PN-CDC-E01', name: '座舱域控', abbreviation: '', supplier: '均胜' },
  { id: 'PN-IC-F02', code: 'PN-IC-F02', name: '仪表', abbreviation: '', supplier: '联创' },
  { id: 'PN-RADAR-01', code: 'PN-RADAR-01', name: '前雷达', abbreviation: '', supplier: '大陆' },
];
