import { ref } from 'vue';
export const REGION_CODES = ['asia', 'europe', 'northAmerica', 'southAmerica', 'africa', 'oceania'] as const;
export type RegionCode = typeof REGION_CODES[number];
/** 状态五态，与零部件/证书模块一致（2026-11-20 用户裁决）；文案由 regulations.statuses.* 提供，颜色由共享状态角色映射。 */
export const STATUS_CODES = ['submitting', 'reviewing', 'completed', 'rejected', 'withdrawn'] as const;
/** 区域→国家一对多映射（2026-11-23 用户裁决：每区列出全部常见国家，此前 countries 单值映射导致亚洲仅有中国）。
    代码即 i18n 键 regulations.<code>，列表筛选/抽屉级联/导入校验共用此表。 */
export const REGION_COUNTRIES: Record<RegionCode, string[]> = {
  asia: ['china', 'japan', 'korea', 'india', 'singapore'],
  europe: ['germany', 'france', 'uk', 'italy', 'spain'],
  northAmerica: ['usa', 'canada', 'mexico'],
  southAmerica: ['brazil', 'argentina', 'chile'],
  africa: ['southAfrica', 'egypt', 'nigeria', 'kenya'],
  oceania: ['australia', 'newZealand'],
};
/** 法规附件：name 为文件名，file 为本会话上传的原始 File（刷新后仅剩文件名，预览/下载时提示重传） */
export interface RegulationAttachment { name: string; file?: File }
export interface Regulation {
  id: string; code: string; name: string; region: typeof REGION_CODES[number]; country: string;
  date: string; creator: string; updater: string; updatedAt: string;
  version: string; status: typeof STATUS_CODES[number]; note: string;
  attachments: RegulationAttachment[]; opinion: string;
}
export const initialRegulations: Regulation[] = [
  { id: 'LAW-0001', code: 'GB-2024-001', name: '车辆排放标准', region: 'asia', country: 'china', date: '2024-01-01', creator: '张三', updater: '张三', updatedAt: '2024-01-08', version: 'V1.0.0', status: 'completed', note: '', attachments: [{ name: '车辆排放标准V1.0.0.pdf' }], opinion: '' },
  { id: 'LAW-0002', code: 'EU-2023-011', name: '整车安全要求', region: 'europe', country: 'germany', date: '2025-12-31', creator: '李四', updater: '王五', updatedAt: '2026-01-12', version: 'V1.2.0', status: 'reviewing', note: '', attachments: [{ name: '整车安全要求V1.2.0.docx' }], opinion: '' },
  { id: 'LAW-0003', code: 'EU-2024-002', name: '电磁兼容要求', region: 'europe', country: 'germany', date: '2025-12-31', creator: '李四', updater: '李四', updatedAt: '2026-02-03', version: 'V1.2.1', status: 'submitting', note: '', attachments: [{ name: '电磁兼容要求V1.2.1.pdf' }], opinion: '' },
];

// Session-scoped records shared by list and child routes.
export const regulationRows = ref<Regulation[]>(structuredClone(initialRegulations));
