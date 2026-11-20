# OpenData 三级任务数据模型 v0.1

2026-11-20。用户已确认分层采用平台主任务 → 流程节点任务 → 应用业务任务。本版落地任务接收、查询、办理、事件回传基础链路。

## 层级与所有权

| 层级 | 所有者 | OpenData 保存内容 |
| --- | --- | --- |
| 平台主任务 | 平台任务中心 | tenantId、platformCode、rootTaskId 关联引用 |
| 流程节点任务 | 平台任务中心 / 流程服务 | nodeTaskId、rootTaskId、workflowInstanceId 不可变关联 |
| 应用业务任务 | OpenData | taskId、businessKey、businessType、标题、负责人、状态、版本和操作记录 |

主任务一对多节点任务，节点任务一对多应用业务任务。业务任务完成仅产生完成事件，上层聚合与流程推进由平台决定。普通页面新建 mock 任务与导入导出任务尚未迁移到该接口。

## 数据表

- `platform_root_reference` 保存主任务的外部标识，复合主键为 tenant_id / platform_code / root_task_id。
- `platform_node_reference` 保存节点到主任务及流程实例的固定关联，复合主键为 tenant_id / platform_code / node_task_id。同一节点再次接收时若主任务或流程实例不同则拒绝。
- `business_task` 保存第三级任务，UUID 主键，tenant_id 参与全部业务读写。tenant/platform/node/business_key 组合唯一，防止重复分发生成多个业务任务。
- `task_action_log` 只通过服务追加，与任务变更处于同一事务，保存动作、前后状态、操作人、原因、时间及目标版本。
- `command_receipt` 保存租户范围的幂等键、请求摘要和结果。摘要包含主体、操作、目标及规范化请求。相同键不同请求返回 409，同请求返回原结果。初版无自动过期删除。
- `task_outbox` 保存与任务同事务生成的事件。包含稳定 event_id、aggregate_version、JSONB 消息、重试次数和下次发送时间。回传未配置时保留待发。

时间统一存为 PostgreSQL timestamptz，HTTP 使用 UTC ISO-8601。内部时间使用 Instant。名称及外部 ID 原样存储，JSON 字段只保存事件与幂等结果。

## 一致性规则

任务 ID 由服务生成，外部 ID 为最长 128 字符字符串。租户和操作者来自认证上下文。业务任务的上游关联创建后保持固定，首次接收状态为 pending，version 为 0。

每次办理携带 expectedVersion。数据库锁定任务行并校验版本和操作者，在同一事务更新状态、增加 version、追加操作记录、写出站事件和幂等结果。幂等重放先于版本校验，因此响应丢失后的重试可返回原结果。

取消或撤回为终态留痕，初版保留任务记录。保留期与归档策略待平台治理契约确定。流程引擎自己的任务 ID 与业务 taskId 分开保存。

## 现有代码依据

`frontend/src/modules/task-center/data/tasks.ts` 当前使用 sessionStorage 与 mock 用户名，定义 pending / in-progress / completed / recalled / cancelled 等状态。旧 rejected 记录已经在初始化时映射为 pending。本后端据此将退回表达为 return 动作并回到 pending。

`backend/workflow` 与 `backend/warmflow` 是既有流程服务。新工程通过端口和 HTTP 适配器与平台通信，沿用它们的独立生命周期。相邻“项目建设”文档描述 HMG，三级任务模型以本契约与本次用户确认作为依据。
