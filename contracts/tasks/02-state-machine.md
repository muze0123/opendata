# 应用业务任务状态机 v0.1

状态代码与首版 API、数据库约束一致。上层主任务和流程节点的状态由平台维护。

| 动作 | 起始状态 | 目标状态 | 操作者 | 额外条件 |
| --- | --- | --- | --- | --- |
| 接收 dispatch | 无 | pending | 具备 dispatch scope 的平台服务 | 合法层级引用、负责人、唯一业务键 |
| start | pending | in-progress | 当前负责人 | expectedVersion 一致 |
| complete | in-progress | completed | 当前负责人 | expectedVersion 一致 |
| return | in-progress | pending | 当前负责人 | 原因必填，returnCount 加一 |
| cancel | pending / in-progress | cancelled | 发起人或平台服务 | 原因必填 |
| recall | pending / in-progress | recalled | 平台服务 | 原因必填 |

completed / cancelled / recalled 为终态，再次迁移返回 409。返回上一节点、审核会签、转交、重新打开等动作在冻结对应平台规则后增加，当前 API 对未定义动作返回 400。

接收和每次成功办理都会增加一条 outbox 事件。version 从 0 开始，每个成功动作加一，同任务事件按版本顺序投递。相同幂等键重放不增加日志、事件或版本。并发办理同一版本时仅一个请求成功，另一个返回 VERSION_CONFLICT。

权限 scope 与负责人校验分别执行。读取其他租户的 taskId 返回 404，具备任务写 scope 也必须满足当前负责人 / 发起人条件。租户不能从请求体覆盖。

## 验收场景

1. 分发 → start → complete，任务完成但平台父状态保持外部所有。
2. start → return → start → complete，退回计数和日志可追溯。
3. pending / in-progress 执行取消或平台撤回后不可再次完成。
4. 重复幂等键、不同请求复用键、旧版本并发、跨租户、非负责人分别得到确定结果。
5. 未配置平台或远端失败时，本地成功提交和待发送事件可从数据库恢复。

## 三层联动规则

| 层级 | 状态推进责任 | 与下层的关系 |
| --- | --- | --- |
| 平台主任务 | 平台任务中心 | 平台根据工作流启动、全部必需节点完成、撤回或取消决定主任务状态 |
| 流程节点任务 | 平台工作流服务 | 节点可关联多个业务任务，由平台依据节点的 all / any 策略决定是否完成节点 |
| 应用业务任务 | OpenData | 只按本文迁移表变更，并发布对应事件 |

平台接收 task.completed 事件后，校验 tenantId、rootTaskId、nodeTaskId、workflowInstanceId 及 aggregateVersion，并按 eventId 去重。该事件提供一个业务任务的完成事实，节点会签、分支合并、父任务聚合由平台继续计算。OpenData 不依据单个任务的状态直接更新平台主任务或节点。

平台撤回或取消需要通过具备 dispatch scope 的主体对关联业务任务提交 recall / cancel 命令，每个业务任务携带各自版本及幂等键。终态任务保留既成事实，平台的补偿或重新发起以新节点 / 新业务键分发，初版不执行隐式重开。

现有 backend/workflow/engine.mjs 中的 running / completed 流程实例状态，以及 pending / external / completed / cancelled 节点执行状态属于技术引擎状态。平台主任务正式业务状态全集仍以平台侧契约为准，当前引用表仅保存关联 ID。前端任务列表的 pending 等展示状态与引擎状态应通过平台适配层转换，避免混为同一枚举。
