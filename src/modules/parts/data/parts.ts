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
