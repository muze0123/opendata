export interface Vehicle { id: string; code: string; directory: string; production: boolean; created: string; effective: string; region: string; owner: string; description: string }
export interface Directory { key: string; title: string; vinRegex?: string; partIds?: string[]; children?: Directory[] }
export const directories: Directory[] = [{ key: 'brand', title: '麦唐汽车', children: [{ key: 'series', title: '乘用车系', children: [{ key: 'model', title: 'MT-SUV-A', children: [{ key: 'default', title: '默认配置', partIds: ['PN-DCU-A01', 'PN-GW-B02', 'PN-TBOX-C03'] }, { key: 'high', title: '高配版' }] }, { key: 'model-b', title: 'MT-SUV-B', children: [{ key: 'b-default', title: '默认配置' }] }] }, { key: 'commercial', title: '商用车系' }] }, { key: 'competitor', title: '竞品品牌' }];
export const vehicles: Vehicle[] = Array.from({ length: 16 }, (_, index) => ({ id: `vehicle-${index}`, code: index < 12 ? `LVA*******${31411 + index}` : `MT-TEST-${index - 11}`, directory: index < 12 ? 'default' : 'high', production: index < 8 || index >= 12, created: '2026-09-18 10:00', effective: '2026-09-20', region: '中国', owner: '张三', description: '量产试装车辆，用于域控联调' }));

export interface VehiclePart { code: string; name: string; supplier: string }
export const vehicleParts: VehiclePart[] = [
  { code: 'PN-DCU-A01', name: '域控制器总成', supplier: '华为' },
  { code: 'PN-GW-B02', name: '车载网关', supplier: '博世' },
  { code: 'PN-TBOX-C03', name: 'T-Box 通信模块', supplier: '大陆' },
];
