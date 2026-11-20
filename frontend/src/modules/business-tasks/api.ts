import { useAuthStore } from '../auth/stores/auth';
import type { Action, ActionLog, ErrorResponse, Session, Task, TaskPage, TaskStatus } from './data/contracts';

export class TaskApiError extends Error {
  constructor(public code: string, public status = 0, public requestId?: string) { super(code); }
}
const BASE = '/api/opendata/v1';
async function request<T>(path: string, options: { signal?: AbortSignal; action?: Action; key?: string } = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = window.setTimeout(abort, 15000);
  try {
    const token = useAuthStore().token;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.action) headers['Content-Type'] = 'application/json';
    if (options.key) headers['Idempotency-Key'] = options.key;
    const response = await fetch(`${BASE}${path}`, {
      method: options.action ? 'POST' : 'GET', headers, signal: controller.signal,
      credentials: 'same-origin', body: options.action ? JSON.stringify(options.action) : undefined,
    });
    let value: unknown;
    try { value = await response.json(); }
    catch { throw new TaskApiError('SERVICE_UNAVAILABLE', response.status); }
    if (!response.ok) {
      const error = value as Partial<ErrorResponse>;
      throw new TaskApiError(error.code ?? 'INTERNAL_ERROR', response.status, error.requestId);
    }
    return value as T;
  } catch (error) {
    if (error instanceof TaskApiError) throw error;
    throw new TaskApiError(controller.signal.aborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export const getSession = (signal?: AbortSignal) => request<Session>('/session', { signal });
export const getTask = (id: string, signal?: AbortSignal) => request<Task>(`/tasks/${encodeURIComponent(id)}`, { signal });
export const getTaskActions = (id: string, signal?: AbortSignal) => request<ActionLog[]>(`/tasks/${encodeURIComponent(id)}/actions`, { signal });
export function listTasks(query: { page: number; size: number; status: TaskStatus | ''; q: string }, signal?: AbortSignal) {
  const search = new URLSearchParams({ page: String(query.page - 1), size: String(query.size) });
  if (query.status) search.set('status', query.status);
  if (query.q) search.set('q', query.q);
  return request<TaskPage>(`/tasks?${search}`, { signal });
}
export const actOnTask = (id: string, action: Action, key: string) => request<Task>(`/tasks/${encodeURIComponent(id)}/actions`, { action, key });
