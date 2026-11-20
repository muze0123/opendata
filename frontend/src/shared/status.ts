/**
 * 平台状态语义角色：设计系统拥有 role → 外观（见 AppStatusTag.vue），
 * 业务域拥有状态枚举、文案与 code → role 映射。未登记的状态码回退 neutral。
 */
export type StatusRole = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type StatusDomain = 'workbench' | 'projects' | 'tasks' | 'sections' | 'templates' | 'reports' | 'vehicle' | 'technical' | 'testing' | 'certificates';

const COMMON: Readonly<Record<string, StatusRole>> = {
  notStarted: 'neutral', pending: 'neutral', draft: 'neutral', paused: 'neutral', normal: 'neutral',
  inProgress: 'info', active: 'info', reviewing: 'info', review: 'info', submitted: 'info',
  completed: 'success', passed: 'success', pass: 'success', approved: 'success',
  overdue: 'warning', high: 'warning', preferred: 'warning',
  rejected: 'danger', failed: 'danger', urgent: 'danger', voided: 'danger',
  submitting: 'neutral', withdrawn: 'neutral',
};

const DOMAIN_OVERRIDES: Partial<Record<StatusDomain, Readonly<Record<string, StatusRole>>>> = {};

export function statusRole(code: string, domain: StatusDomain = 'workbench'): StatusRole {
  return DOMAIN_OVERRIDES[domain]?.[code] ?? COMMON[code] ?? 'neutral';
}
