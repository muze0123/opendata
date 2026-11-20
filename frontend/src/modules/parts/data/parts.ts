import type { Regulation } from '../../regulations/data/regulations';

/** 零部件等级/开发方式仍为车型车辆等模块引用的基础字典，零部件页本身不再展示。 */
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

/** 证书状态五态，与证书模块一致；文案由 parts.statuses.* 提供，颜色由业务域映射语义角色。 */
export const PART_STATUSES = ['submitting', 'reviewing', 'completed', 'rejected', 'withdrawn'] as const;
export type PartStatus = typeof PART_STATUSES[number];

/** 处理时间线事件动作。draft 表示保存草稿，尚未进入审批流。 */
export const PART_EVENT_ACTIONS = ['create', 'draft', 'submit', 'approve', 'reject', 'withdraw', 'import'] as const;
export type PartEventAction = typeof PART_EVENT_ACTIONS[number];
export interface PartEvent {
  id: string;
  action: PartEventAction;
  actor: string;
  time: string;
  comment?: string;
}
export interface PartReview { reviewer: string; approved: boolean; opinion: string; time: string }

/** 本地附件：name 可跨标签页缓存，file 仅存在于当前会话，用于预览/下载。 */
export interface PartAttachment { name: string; file?: File }

/** 原「关联项目」全量改名为关联任务；字段 code/name 对应任务编号/任务名称。 */
export interface PartRelatedTask {
  id: string;
  code: string;
  name: string;
  brand: string;
  series: string;
  model: string;
  priority: 'high' | 'medium' | 'low';
  status: PartStatus;
}
/** 旧类型别名，仅供仍在引用 relatedProjects 的历史数据兼容，不再用于新界面。 */
export type PartRelatedProject = PartRelatedTask;

export interface Part {
  id: string;
  /** 零部件编号：按已配置的编号规则生成。 */
  code: string;
  /** 零部件名称（必填 ≤100）。 */
  name: string;
  /** 法规编号（必填，下拉显示编号 + 名称）。 */
  regulationCode: string;
  /** 零部件证书输入框值（必填 ≤100）。 */
  certificate: string;
  certificateFile?: PartAttachment;
  /** 零部件证书号（必填 ≤100）。 */
  certificateNo: string;
  /** 零部件证书版本号（必填 ≤20）。 */
  certificateVersion: string;
  /** 证书签发日期（必填，单选日期）。 */
  issueDate: string;
  /** 型号（必填 ≤100）。 */
  model: string;
  /** 商标输入框值（必填 ≤100）。 */
  brand: string;
  brandFile?: PartAttachment;
  /** 版本说明（选填 ≤200）。 */
  versionNote: string;
  /** 证书状态；空串表示草稿，尚未提交审批。 */
  status: PartStatus | '';
  creator: string;
  createdAt: string;
  updater: string;
  updatedAt: string;
  events: PartEvent[];
  history: PartReview[];
  relatedTasks: PartRelatedTask[];
  relatedRegulations?: Regulation[];

  /* ---- 兼容字段：车型车辆模块与旧缓存仍可能读取，零部件页不再编辑或展示 ---- */
  abbreviation?: string;
  level?: typeof LEVEL_CODES[number] | '';
  development?: typeof DEVELOPMENT_CODES[number] | '';
  supplier?: string;
  material?: string;
  ip?: string;
  owner?: string;
  securityOwner?: string;
  hardware?: HardwareVersion[];
  relatedProjects?: PartRelatedTask[];
  region?: string;
  versionDevelopment?: string;
  approval?: { decision: 'approved' | 'rejected'; opinion: string };
}

export type Segment = { id: string; kind: 'fixed' | 'variable' | 'year'; value: string };

export const suppliers = ['博世汽车部件', '大陆集团', '电装中国'];
export const INTERFACE_CODES = ['CAN0', 'ETH1', 'LIN0'];
export const PROTOCOL_CODES = ['UDS', 'DoIP'];

export const CURRENT_USER = '当前用户';

export function taskTime(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

export function emptyPart(): Part {
  return {
    id: '', code: '', name: '', regulationCode: '', certificate: '', certificateNo: '',
    certificateVersion: '', issueDate: '', model: '', brand: '', versionNote: '',
    status: '', creator: CURRENT_USER, createdAt: '', updater: CURRENT_USER, updatedAt: '',
    events: [], history: [], relatedTasks: [],
  };
}

/** 合并显式事件与审批记录，按时间升序，供详情页处理时间线使用。 */
export function partTimeline(part: Part): PartEvent[] {
  const approvals: PartEvent[] = (part.history ?? []).map((event, index) => ({
    id: `approval-${index}`,
    action: event.approved ? 'approve' : 'reject',
    actor: event.reviewer,
    time: event.time,
    comment: event.opinion,
  }));
  return [...(part.events ?? []), ...approvals].sort((a, b) => a.time.localeCompare(b.time));
}

/** 本地任务摘要：关联任务列表在平台任务接口接入前的只读快照。 */
export const PART_RELATED_TASKS: PartRelatedTask[] = Array.from({ length: 4 }, (_, index) => ({
  id: `TASK-${String(index + 1).padStart(4, '0')}`,
  code: `TASK-${String(index + 1).padStart(4, '0')}`,
  name: ['车辆排放标准合规任务', '整车安全验证任务', '电磁兼容摸底任务', '制动性能确认任务'][index] ?? `合规任务 ${index + 1}`,
  brand: ['比亚迪', '上汽', '吉利', '长城'][index] ?? '比亚迪',
  series: ['王朝', '荣威', '领克', '哈弗'][index] ?? '王朝',
  model: ['汉 EV', 'RX5', '星越 L', 'H6'][index] ?? '汉 EV',
  priority: (['high', 'medium', 'low', 'medium'] as const)[index] ?? 'medium',
  status: PART_STATUSES[index] ?? 'submitting',
}));

/** 新记录填充关联任务与初始事件，使详情时间线在首次创建后即可查看。 */
export function seedPart(part: Part): Part {
  const now = taskTime();
  return {
    ...part,
    createdAt: part.createdAt || now,
    relatedTasks: structuredClone(PART_RELATED_TASKS),
    events: part.events.length ? part.events : [{ id: crypto.randomUUID(), action: 'create', actor: CURRENT_USER, time: now }],
  };
}

/**
 * 零部件目录种子（基础数据库零部件库的最小可用集合）。
 * 目录编辑器依赖基础库作为可选零部件来源；与本页的 initialized / 空行判断无关。
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
