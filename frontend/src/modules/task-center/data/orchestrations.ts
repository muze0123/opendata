/**
 * 任务编排（mock）：1:1 复刻「功能数据安全合规自评」项目的新建任务抽屉数据。
 * 节点结构为 提交 → 审核（可多层）→ 结束，选中后在抽屉内展示缩略流程预览。
 */
export interface TaskOrchestrationNode {
  kind: 'submit' | 'review' | 'end';
  label: string;
  /** 节点说明：提交人 / 指定成员 / 流程已结束 */
  detail: string;
}

export interface TaskOrchestration {
  id: string;
  name: string;
  nodes: TaskOrchestrationNode[];
}

export const TASK_ORCHESTRATIONS: TaskOrchestration[] = [
  {
    id: 'ORC-001', name: '合规自评标准编排',
    nodes: [
      { kind: 'submit', label: '提交', detail: '提交人：全部成员' },
      { kind: 'review', label: '审核', detail: '指定成员：合规专员' },
      { kind: 'end', label: '结束', detail: '流程已结束' },
    ],
  },
  {
    id: 'ORC-002', name: '量产前快速评估编排',
    nodes: [
      { kind: 'submit', label: '提交', detail: '提交人：功能负责人' },
      { kind: 'review', label: '审核', detail: '指定成员：数据安全委员会' },
      { kind: 'review', label: '复核', detail: '指定成员：合规专员' },
      { kind: 'end', label: '结束', detail: '流程已结束' },
    ],
  },
];
