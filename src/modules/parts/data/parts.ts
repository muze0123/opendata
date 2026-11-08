export const LEVEL_CODES = ['qm', 'asilA', 'asilB', 'asilC', 'asilD'] as const;
export const DEVELOPMENT_CODES = ['internal', 'purchased', 'joint'] as const;
export const SCAN_CODES = ['unconfigured', 'queued', 'failed', 'available'] as const;
export interface SoftwareVersion {
  id: string;
  name: string;
  interfaces: string[];
  protocols: string[];
  scan: typeof SCAN_CODES[number];
  fileName: string;
}
export interface HardwareVersion { id: string; name: string; note: string; software: SoftwareVersion[] }
export interface Part {
  id: string; code: string; name: string; abbreviation: string;
  level: typeof LEVEL_CODES[number] | ''; development: typeof DEVELOPMENT_CODES[number] | '';
  supplier: string; material: string; ip: string; owner: string; securityOwner: string;
  hardware: HardwareVersion[];
}
export type Segment = { id: string; kind: 'fixed' | 'variable' | 'year'; value: string };
export const suppliers = ['博世汽车部件', '大陆集团', '电装中国'];
export const INTERFACE_CODES = ['CAN0', 'ETH1', 'LIN0'];
export const PROTOCOL_CODES = ['UDS', 'DoIP'];
export function emptyPart(): Part {
  return { id: '', code: '', name: '', abbreviation: '', level: '', development: '', supplier: '', material: '', ip: '', owner: '', securityOwner: '', hardware: [] };
}
