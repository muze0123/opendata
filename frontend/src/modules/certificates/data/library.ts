import { ref } from 'vue';

/** 证书管理台账状态代码；业务文案由 certificateLibrary.statuses.* 提供，不从颜色反推。 */
export const LIBRARY_STATUSES = ['submitting', 'reviewing', 'completed', 'rejected', 'withdrawn'] as const;
export type LibraryStatus = typeof LIBRARY_STATUSES[number];
export const LIBRARY_EVENT_ACTIONS = ['create', 'draft', 'submit', 'approve', 'reject', 'withdraw', 'import'] as const;

export interface LibraryEvent {
  id: string;
  action: typeof LIBRARY_EVENT_ACTIONS[number];
  actor: string;
  time: string;
  comment?: string;
}

export interface LibraryEntry {
  regulation: string;
  regulationName: string;
  number: string;
  name?: string;
  issuer: string;
  agency: string;
  issued: string;
  expires: string;
}

export interface LibraryRecord {
  id: string;
  name: string;
  project: string;
  status: LibraryStatus;
  entries: LibraryEntry[];
  history: { reviewer: string; approved: boolean; opinion: string; time: string }[];
  events?: LibraryEvent[];
}

/** 详情基础信息所需的关联任务摘要；台账为只读快照，不与任务模块联动。 */
export interface LibraryProject {
  id: string;
  name: string;
  brand: string;
  series: string;
  model: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  owner: string;
  createdAt: string;
  deadline: string;
  reviewer: string;
}

export function libraryTimeline(record: LibraryRecord): LibraryEvent[] {
  const approvals = record.history.map((event, index): LibraryEvent => ({
    id: `approval-${index}`,
    action: event.approved ? 'approve' : 'reject',
    actor: event.reviewer,
    time: event.time,
    comment: event.opinion,
  }));
  return [...(record.events ?? []), ...approvals].sort((a, b) => a.time.localeCompare(b.time));
}

const REGULATION_NAMES = ['车辆排放标准', '整车安全要求', '车辆电磁兼容要求', '车辆制动性能要求'] as const;
const REGULATIONS = ['GB-2024-001', 'EU-2023-011', 'ECE-R43', 'GB-2024-002'] as const;
const BRANDS = ['比亚迪', '上汽', '吉利', '长城'] as const;
const OWNERS = ['张明', '李芳', '王强', '陈静'] as const;
const REVIEWERS = ['赵敏', '刘洋', '周涛', '孙丽'] as const;
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

/** 独立台账快照：16 条记录覆盖 5 种状态，字段结构对齐 HMG 证书管理模块。 */
export const libraryProjects: LibraryProject[] = Array.from({ length: 16 }, (_, index) => ({
  id: `TASK-${String(index + 1).padStart(4, '0')}`,
  name: `车辆安全合规任务 ${index + 1}`,
  brand: BRANDS[index % BRANDS.length]!,
  series: ['王朝', '荣威', '领克', '哈弗'][index % 4]!,
  model: ['汉 EV', 'RX5', '星越 L', 'H6'][index % 4]!,
  priority: PRIORITIES[index % PRIORITIES.length]!,
  owner: OWNERS[index % OWNERS.length]!,
  createdAt: '2026-10-28 09:00:00',
  deadline: '2026-12-31',
  reviewer: REVIEWERS[index % REVIEWERS.length]!,
}));

export const libraryRecords = ref<LibraryRecord[]>(libraryProjects.map((project, index) => {
  const status = LIBRARY_STATUSES[index % LIBRARY_STATUSES.length]!;
  const number = `CERT-2026-${String(index + 1).padStart(3, '0')}`;
  const events: LibraryEvent[] = [
    { id: `${project.id}-created`, action: 'create', actor: project.owner, time: project.createdAt },
    { id: `${project.id}-draft`, action: 'draft', actor: project.owner, time: '2026-11-02 09:00:00' },
  ];
  if (status !== 'submitting') {
    events.push({ id: `${project.id}-submitted`, action: 'submit', actor: project.owner, time: '2026-11-02 10:00:00' });
  }
  if (status === 'withdrawn') {
    events.push({ id: `${project.id}-withdrawn`, action: 'withdraw', actor: project.owner, time: '2026-11-03 09:00:00' });
  }
  const history = status === 'completed' || status === 'rejected'
    ? [{ reviewer: project.reviewer, approved: status === 'completed', opinion: '', time: '2026-11-03 10:00:00' }]
    : [];
  return {
    id: `CL-${String(index + 1).padStart(4, '0')}`,
    name: number,
    project: project.id,
    status,
    entries: [{
      regulation: REGULATIONS[index % REGULATIONS.length]!,
      regulationName: REGULATION_NAMES[index % REGULATION_NAMES.length]!,
      number,
      name: number,
      issuer: '中汽研',
      agency: 'TÜV',
      issued: '2026-01-10',
      expires: '2029-01-09',
    }],
    events,
    history,
  };
}));
