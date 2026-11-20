import { reactive, watch } from 'vue';
import { TASK_ORCHESTRATIONS } from './orchestrations';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'rejected' | 'recalled' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskTab = 'all' | 'pending' | 'processed' | 'created' | 'copied';

/**
 * 来源/目标应用：数据层只存 code，展示文案由 tasks.appLabels.<code> 提供。
 * 这里既是类型来源，也是筛选下拉的可选值，新增应用只改这一行 + 两份文案。
 */
export const APP_CODES = ['tianxun', 'tianjian', 'lims', 'csms', 'modelProject', 'tianshu'] as const;
export type TaskAppCode = (typeof APP_CODES)[number];

/** 相关项目：同样存 code，展示走 tasks.projectLabels.<code> */
export const PROJECT_CODES = ['aionY', 'mtSuvA', 'mtEvB', 'mtSedC'] as const;
export type TaskProjectCode = (typeof PROJECT_CODES)[number];

/** 操作记录的动作类型：数据层存 code，展示走 tasks.actionsLog.<code> */
export const ACTION_CODES = ['submit', 'execute', 'approve', 'reject', 'return', 'finish', 'recall', 'transfer', 'cancel'] as const;
export type TaskActionCode = (typeof ACTION_CODES)[number];

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface TaskActionRecord {
  id: string;
  action: TaskActionCode;
  operator: string;
  detail: string;
  time: string;
  duration?: string;
}

export interface TaskFlowNode {
  id: string;
  type: 'submit' | 'review' | 'end';
  title: string;
  assignee: string;
  status: 'completed' | 'current' | 'pending';
}

export interface TaskRecord {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  deadline: string;
  sourceApp: TaskAppCode;
  targetApp: TaskAppCode;
  project: TaskProjectCode;
  vehicle: string;
  creator: string;
  assignees: string[];
  copiedUsers: string[];
  attachments: TaskAttachment[];
  flow: TaskFlowNode[];
  records: TaskActionRecord[];
  content: string;
  handlingOpinion: string;
  handlingAttachments?: TaskAttachment[];
  copiedRoles?: string[];
  /** 新建任务抽屉所选的编排 ID（1:1 复刻自评项目）；复制预填与详情回溯用 */
  orchestrationId?: string;
}

export const currentTaskUser = '张三';
export const memberOptions = ['张三', '李四', '王五', '赵六', '林浩', '周明'];
/** 车型是产品名，语言无关，不做翻译 */
export const vehicleOptions = ['AION Y', 'MT-SUV-A', 'MT-EV-B', 'MT-SED-C'];

const makeFlow = (status: TaskStatus, assignees: string[]): TaskFlowNode[] => {
  const terminal = status === 'completed' || status === 'recalled' || status === 'cancelled';
  const reviewDone = status === 'completed' || status === 'rejected' || status === 'recalled' || status === 'cancelled';
  return [
    { id: 'submit', type: 'submit', title: '提交', assignee: '发起人：张三', status: 'completed' },
    { id: 'review', type: 'review', title: '审核', assignee: `指定成员：${assignees[0] ?? '请选择'}`, status: reviewDone ? 'completed' : 'current' },
    { id: 'end', type: 'end', title: '结束', assignee: terminal ? '流程已结束' : '流程未结束', status: terminal ? 'completed' : 'pending' },
  ];
};

const seedTasks: TaskRecord[] = [
  {
    id: 'T-20261001', name: '天巡扫描结果复核', description: '请复核天巡扫描结果，确认高危问题已完成闭环。', status: 'pending', priority: 'high',
    createdAt: '2026-03-29 10:12', updatedAt: '2026-03-30 09:48', deadline: '2026-03-31 18:00', sourceApp: 'tianxun', targetApp: 'tianshu', project: 'aionY', vehicle: 'AION Y', creator: '张三', assignees: ['李四'], copiedUsers: ['王五'],
    attachments: [{ id: 'a-1', name: '扫描结果复核说明.pdf', size: 1024 * 860, type: 'application/pdf' }], flow: makeFlow('pending', ['李四']), records: [{ id: 'r-1', action: 'submit', operator: '张三', detail: '创建任务并提交', time: '2026-03-29 10:12', duration: '耗时 8 分钟' }], content: '复核零部件固件与 SBOM 一致性，确认无高危漏洞后闭环。', handlingOpinion: '',
  },
  {
    id: 'T-20261002', name: 'TARA 相关项边界确认', description: '确认 TARA 相关项边界及责任分工。', status: 'in-progress', priority: 'medium',
    createdAt: '2026-03-28 14:00', updatedAt: '2026-03-30 09:12', deadline: '2026-04-02 18:00', sourceApp: 'tianjian', targetApp: 'tianjian', project: 'mtSuvA', vehicle: 'MT-SUV-A', creator: '王五', assignees: ['张三'], copiedUsers: ['李四'],
    attachments: [], flow: makeFlow('in-progress', ['张三']), records: [{ id: 'r-2', action: 'submit', operator: '王五', detail: '创建任务并提交', time: '2026-03-28 14:00' }, { id: 'r-3', action: 'execute', operator: '张三', detail: '开始处理任务', time: '2026-03-30 09:12' }], content: '梳理 TARA 相关项边界，输出确认结论。', handlingOpinion: '',
  },
  {
    id: 'T-20261003', name: 'LIMS 用例不通过问题跟进', description: '跟进 LIMS 用例不通过问题并完成整改验证。', status: 'pending', priority: 'high',
    createdAt: '2026-03-29 09:00', updatedAt: '2026-03-29 18:20', deadline: '2026-03-30 18:00', sourceApp: 'lims', targetApp: 'tianshu', project: 'aionY', vehicle: 'AION Y', creator: '张三', assignees: ['林浩'], copiedUsers: [],
    attachments: [], flow: makeFlow('pending', ['林浩']), records: [{ id: 'r-4', action: 'submit', operator: '张三', detail: '创建任务并提交', time: '2026-03-29 09:00' }], content: '请跟进失败用例，补充问题定位和整改验证结果。', handlingOpinion: '',
  },
  {
    id: 'T-20261004', name: '项目延期申请', description: '确认项目延期申请及后续计划。', status: 'completed', priority: 'medium',
    createdAt: '2026-03-20 11:00', updatedAt: '2026-03-28 11:30', deadline: '2026-03-25 18:00', sourceApp: 'modelProject', targetApp: 'modelProject', project: 'mtEvB', vehicle: 'MT-EV-B', creator: '李四', assignees: ['张三'], copiedUsers: ['王五'],
    attachments: [], flow: makeFlow('completed', ['张三']), records: [{ id: 'r-5', action: 'submit', operator: '李四', detail: '创建任务并提交', time: '2026-03-20 11:00', duration: '耗时 8 分钟' }, { id: 'r-6', action: 'approve', operator: '张三', detail: '审核通过，任务结束', time: '2026-03-28 11:30', duration: '耗时 15 分钟' }], content: '确认延期原因、影响范围和后续排期。', handlingOpinion: '已确认延期计划。',
  },
  {
    id: 'T-20261005', name: 'CSMS 交付物审批', description: '审批 CSMS 项目交付物。', status: 'rejected', priority: 'low',
    createdAt: '2026-03-26 09:00', updatedAt: '2026-03-27 16:04', deadline: '2026-04-01 18:00', sourceApp: 'csms', targetApp: 'csms', project: 'mtSedC', vehicle: 'MT-SED-C', creator: '赵六', assignees: ['张三'], copiedUsers: [],
    attachments: [], flow: makeFlow('pending', ['张三']), records: [{ id: 'r-7', action: 'submit', operator: '赵六', detail: '创建任务并提交', time: '2026-03-26 09:00' }, { id: 'r-8', action: 'reject', operator: '张三', detail: '材料不完整，退回补充', time: '2026-03-27 16:04' }], content: '请审批交付物并反馈审批意见。', handlingOpinion: '材料不完整，请补充测试报告。',
  },
  {
    id: 'T-20261006', name: '固件包扫描任务', description: '完成固件包扫描并输出结果。', status: 'cancelled', priority: 'medium',
    createdAt: '2026-03-24 10:00', updatedAt: '2026-03-26 10:00', deadline: '2026-03-28 18:00', sourceApp: 'tianxun', targetApp: 'tianxun', project: 'aionY', vehicle: 'AION Y', creator: '张三', assignees: ['李四'], copiedUsers: [],
    attachments: [], flow: makeFlow('cancelled', ['李四']), records: [{ id: 'r-9', action: 'submit', operator: '张三', detail: '创建任务并提交', time: '2026-03-24 10:00' }, { id: 'r-10', action: 'cancel', operator: '张三', detail: '任务已作废', time: '2026-03-26 10:00' }], content: '完成固件包扫描任务。', handlingOpinion: '',
  },
  {
    id: 'T-20261007', name: '安全策略评审', description: '评审车型项目安全策略。', status: 'completed', priority: 'urgent',
    createdAt: '2026-03-21 09:20', updatedAt: '2026-03-24 17:30', deadline: '2026-03-26 18:00', sourceApp: 'modelProject', targetApp: 'tianshu', project: 'mtSuvA', vehicle: 'MT-SUV-A', creator: '周明', assignees: ['王五'], copiedUsers: ['张三'],
    attachments: [], flow: makeFlow('completed', ['王五']), records: [{ id: 'r-11', action: 'submit', operator: '周明', detail: '创建任务并提交', time: '2026-03-21 09:20', duration: '耗时 10 分钟' }, { id: 'r-12', action: 'approve', operator: '王五', detail: '审核通过，任务结束', time: '2026-03-24 17:30', duration: '耗时 22 分钟' }], content: '完成安全策略文档评审。', handlingOpinion: '评审通过。',
  },
  {
    id: 'T-20261008', name: '供应商整改项确认', description: '确认供应商整改项闭环状态。', status: 'in-progress', priority: 'medium',
    createdAt: '2026-03-30 08:40', updatedAt: '2026-03-30 10:20', deadline: '2026-04-04 18:00', sourceApp: 'tianjian', targetApp: 'modelProject', project: 'mtEvB', vehicle: 'MT-EV-B', creator: '张三', assignees: ['林浩'], copiedUsers: ['赵六'],
    attachments: [], flow: makeFlow('in-progress', ['林浩']), records: [{ id: 'r-13', action: 'submit', operator: '张三', detail: '创建任务并提交', time: '2026-03-30 08:40' }], content: '确认供应商整改项是否完成闭环。', handlingOpinion: '',
  },
];

// 覆盖终态、内部办理和分页场景，记录保留各自动作语义。
const mockStatuses: TaskStatus[] = ['pending', 'in-progress', 'completed', 'recalled', 'cancelled'];
const scenarioTasks = mockStatuses.map((status, index): TaskRecord => ({
  ...seedTasks[0]!,
  id: `TSK-${String(index + 1).padStart(4, '0')}`,
  name: `任务流程验证 ${index + 1}`,
  status,
  sourceApp: 'tianshu',
  targetApp: 'tianshu',
  vehicle: 'MT-SUV-A / 默认配置',
  assignees: [currentTaskUser],
  attachments: [],
  flow: status === 'pending' ? [
    { id: 'start', type: 'submit', title: '提交', assignee: '发起人：张三', status: 'completed' },
    ...makeFlow(status, [currentTaskUser]).map((node, index) => ({ ...node, status: index === 0 ? 'current' as const : 'pending' as const })),
  ] : makeFlow(status, [currentTaskUser]),
  records: [{ id: `scenario-${index}`, action: status === 'cancelled' ? 'cancel' : status === 'recalled' ? 'recall' : status === 'completed' ? 'finish' : 'submit', operator: currentTaskUser, detail: '', time: '2026-11-09 09:00:00', duration: status === 'completed' ? '耗时 18 分钟' : undefined }],
}));
const initialTasks: TaskRecord[] = [...seedTasks.map(task => ({ ...task, createdAt: task.createdAt.length === 16 ? task.createdAt + ':00' : task.createdAt, updatedAt: task.updatedAt.length === 16 ? task.updatedAt + ':00' : task.updatedAt, status: task.status === 'rejected' ? 'pending' as const : task.status })), ...scenarioTasks];
const TASK_SESSION_KEY = 'opendata-task-session-v2';
function restoreTasks(): TaskRecord[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(TASK_SESSION_KEY) ?? 'null');
    if (Array.isArray(stored) && stored.every(item =>
      item && typeof item.id === 'string' && typeof item.name === 'string'
      && mockStatuses.includes(item.status) && Array.isArray(item.flow)
      && Array.isArray(item.records) && Array.isArray(item.attachments)
      && Array.isArray(item.assignees) && Array.isArray(item.copiedUsers)
    )) return (stored as TaskRecord[]).map(task => ({
      ...task,
      flow: task.flow[0]?.status === 'current' && !task.flow.some(node => node.id === 'start')
        ? [{ id: 'start', type: 'submit', title: '提交', assignee: `发起人：${task.creator}`, status: 'completed' }, ...task.flow]
        : ['pending', 'in-progress'].includes(task.status) && !task.flow.some(node => node.status === 'current')
        ? makeFlow(task.status, task.assignees)
        : task.flow,
    }));
  } catch { /* 无效缓存使用初始演示数据。 */ }
  return initialTasks;
}
export const taskRecords = reactive<TaskRecord[]>(restoreTasks());
watch(taskRecords, records => {
  try { sessionStorage.setItem(TASK_SESSION_KEY, JSON.stringify(records)); }
  catch { /* 存储不可用时，当前页面仍可继续办理。 */ }
}, { deep: true, flush: 'sync' });


export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: '待处理', 'in-progress': '进行中', completed: '已完成', rejected: '已驳回', recalled: '已撤回', cancelled: '已作废',
};
export const taskPriorityLabels: Record<TaskPriority, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' };

export function getTask(taskId: string) {
  return taskRecords.find((task) => task.id === taskId);
}

function nowText() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function appendTaskRecord(task: TaskRecord, action: TaskActionCode, detail: string) {
  task.records.push({ id: `${task.id}-${Date.now()}`, action, operator: currentTaskUser, detail, time: nowText() });
  task.updatedAt = nowText();
}

export function updateTaskStatus(task: TaskRecord, status: TaskStatus, action: TaskActionCode, detail: string) {
  task.status = status;
  task.flow = makeFlow(status, task.assignees);
  appendTaskRecord(task, action, detail);
}

export interface CreateTaskDrawerInput {
  taskName: string;
  taskDescription?: string;
  priority: TaskPriority;
  deadline?: string;
  orchestrationId: string;
  attachments?: { name: string; size: number }[];
}

/**
 * 新建任务抽屉的创建入口：按所选编排生成流程节点，任务状态为「待处理」并置顶写入列表。
 * 任务名称唯一性等校验由抽屉组件负责，这里只负责落库到本地 mock 数据源。
 */
export function createTaskFromDrawer(input: CreateTaskDrawerInput): TaskRecord {
  const orchestration = TASK_ORCHESTRATIONS.find((item) => item.id === input.orchestrationId);
  const flow: TaskFlowNode[] = orchestration
    ? orchestration.nodes.map((node, index) => ({
      id: `${node.kind}-${index}`, type: node.kind, title: node.label, assignee: node.detail,
      status: index === 0 ? 'completed' : index === 1 ? 'current' : 'pending',
    }))
    : makeFlow('pending', [memberOptions[1] ?? '李四']);
  const timestamp = nowText();
  const record: TaskRecord = {
    id: `TSK-${String(Math.max(0, ...taskRecords.map(task => Number(task.id.replace(/^TSK-/, '')) || 0)) + 1).padStart(4, '0')}`,
    name: input.taskName,
    description: input.taskDescription ?? '',
    status: 'pending',
    priority: input.priority,
    createdAt: timestamp,
    updatedAt: timestamp,
    deadline: input.deadline || '',
    sourceApp: 'tianshu', targetApp: 'tianshu', project: 'aionY', vehicle: 'AION Y',
    creator: currentTaskUser,
    assignees: [memberOptions[1] ?? '李四'],
    copiedUsers: [],
    attachments: (input.attachments ?? []).map((item, index) => ({
      id: `att-${Date.now()}-${index}`, name: item.name, size: item.size, type: '',
    })),
    flow,
    records: [{ id: `r-${Date.now()}`, action: 'submit', operator: currentTaskUser, detail: '创建任务并提交', time: timestamp }],
    content: '',
    handlingOpinion: '',
    orchestrationId: input.orchestrationId,
  };
  taskRecords.unshift(record);
  return record;
}
