import { ref } from 'vue';
export const REGION_CODES = ['asia', 'europe', 'northAmerica', 'southAmerica', 'africa', 'oceania'] as const;
export const STATUS_CODES = ['pending', 'reviewing', 'completed', 'rejected'] as const;
export const countries = { asia: 'china', europe: 'germany', northAmerica: 'usa', southAmerica: 'brazil', africa: 'southAfrica', oceania: 'australia' } as const;
export interface Regulation {
  id: string; code: string; name: string; region: typeof REGION_CODES[number]; country: string;
  date: string; creator: string; version: string; status: typeof STATUS_CODES[number]; note: string;
  attachments: string[]; opinion: string;
}
export const initialRegulations: Regulation[] = [
  { id: 'LAW-0001', code: 'GB-2024-001', name: '车辆排放标准', region: 'asia', country: 'china', date: '2024-01-01', creator: '张三', version: 'V1.0.0', status: 'completed', note: '', attachments: [], opinion: '' },
  { id: 'LAW-0002', code: 'EU-2023-011', name: '整车安全要求', region: 'europe', country: 'germany', date: '2025-12-31', creator: '李四', version: 'V1.2.0', status: 'reviewing', note: '', attachments: [], opinion: '' },
  { id: 'LAW-0003', code: 'EU-2024-002', name: '电磁兼容要求', region: 'europe', country: 'germany', date: '2025-12-31', creator: '李四', version: 'V1.2.1', status: 'pending', note: '', attachments: [], opinion: '' },
];

// Session-scoped records shared by list and child routes.
export const regulationRows = ref<Regulation[]>(structuredClone(initialRegulations));
