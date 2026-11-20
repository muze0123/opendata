import { useI18n } from 'vue-i18n';
import { TaskApiError } from './api';
import type { Session, Task, TaskAction, TaskStatus } from './data/contracts';
import type { StatusRole } from '../../shared/status';

export function useBusinessTaskLabels() {
  const { t, te, locale } = useI18n();
  function statusLabel(code: TaskStatus) { const key = `businessTasks.statuses.${code}`; return te(key) ? t(key) : code; }
  function actionLabel(code: TaskAction | 'received') { const key = `businessTasks.actions.${code}`; return te(key) ? t(key) : code; }
  function errorLabel(error: unknown) {
    const key = `businessTasks.errors.${error instanceof TaskApiError ? error.code : 'INTERNAL_ERROR'}`;
    return te(key) ? t(key) : t('businessTasks.errors.INTERNAL_ERROR');
  }
  function dateLabel(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  return { statusLabel, actionLabel, errorLabel, dateLabel };
}
export function taskRole(status: TaskStatus): StatusRole {
  const roles: Record<TaskStatus, StatusRole> = { pending: 'neutral', 'in-progress': 'info', completed: 'success', recalled: 'neutral', cancelled: 'neutral' };
  return roles[status];
}
export function allowedActions(task: Task, session: Session): TaskAction[] {
  if (task.status !== 'pending' && task.status !== 'in-progress') return [];
  const service = session.scopes.includes('opendata.tasks.dispatch');
  if (!service && !session.scopes.includes('opendata.tasks.write')) return [];
  const actions: TaskAction[] = [];
  if (task.assigneeId === session.userId) actions.push(...(task.status === 'pending' ? ['start'] as const : ['complete', 'return'] as const));
  if (service || task.creatorId === session.userId) actions.push('cancel');
  if (service) actions.push('recall');
  return actions;
}
