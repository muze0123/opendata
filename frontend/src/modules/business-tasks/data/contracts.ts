// Generated from contracts/tasks/openapi.json by pnpm contracts:generate.
export const TASK_STATUS_CODES = ["pending","in-progress","completed","recalled","cancelled"] as const;
export type TaskStatus = typeof TASK_STATUS_CODES[number];
export const TASK_ACTION_CODES = ["start","complete","return","cancel","recall"] as const;
export type TaskAction = typeof TASK_ACTION_CODES[number];

export interface Dispatch {
  platformCode: string;
  rootTaskId: string;
  nodeTaskId: string;
  workflowInstanceId: string;
  businessKey: string;
  businessType: string;
  title: string;
  description: string;
  creatorId: string;
  assigneeId: string;
}

export interface Action {
  action: TaskAction;
  expectedVersion: number;
  reason: string;
}

export interface Task {
  id: string;
  tenantId: string;
  platformCode: string;
  rootTaskId: string;
  nodeTaskId: string;
  workflowInstanceId: string;
  businessKey: string;
  businessType: string;
  title: string;
  description: string;
  creatorId: string;
  assigneeId: string;
  status: TaskStatus;
  version: number;
  returnCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  requestId: string;
}

export interface TaskPage {
  items: Array<Task>;
  total: number;
  page: number;
  size: number;
}

export interface ActionLog {
  id: string;
  taskId: string;
  action: string;
  fromStatus: "pending" | "in-progress" | "completed" | "recalled" | "cancelled" | null;
  toStatus: "pending" | "in-progress" | "completed" | "recalled" | "cancelled";
  operatorId: string;
  reason: string;
  taskVersion: number;
  occurredAt: string;
}

export interface Session {
  tenantId: string;
  userId: string;
  scopes: Array<string>;
}

export interface DeliveryEvent {
  eventId: string;
  taskId: string;
  aggregateVersion: number;
  eventType: string;
  status: "pending" | "blocked" | "failed" | "delivered";
  attempts: number;
  availableAt: string;
  deliveredAt: string | null;
  lastError: string | null;
  blockedByEventId: string | null;
}

export interface DeliveryEventPage {
  items: Array<DeliveryEvent>;
  total: number;
  page: number;
  size: number;
}

export interface DeliverySummary {
  total: number;
  pending: number;
  blocked: number;
  failed: number;
  delivered: number;
}

export interface DeliveryRetry {
  expectedAttempts: number;
  reason: string;
}

export interface DeliveryRetryReceipt {
  id: string;
  eventId: string;
  requestedBy: string;
  reason: string;
  previousError: string;
  attempts: number;
  requestedAt: string;
}

export interface DeliveryRetryPage {
  items: Array<DeliveryRetryReceipt>;
  total: number;
  page: number;
  size: number;
}
