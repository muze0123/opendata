# 平台任务事件投递管理 v0.1

本模块管理 OpenData 已持久化的 task_outbox，不创建平台主任务，也不修改业务任务状态。真实平台接收端仍按 03-platform-contract.md 联调。

## 权限与查询

基础路径 `/api/opendata/v1/platform/task-events`。所有对象均受认证主体 tenant_id 限制，其他租户和不存在的 eventId 同样返回 404。读取需要独立 scope `opendata.platform.events.read`，人工重试需要 `opendata.platform.events.retry`；业务任务 read/write/dispatch 权限不自动取得这些权限。local profile 显式授予本地调试权限。

- GET 基础路径：分页列表，page 从 0 开始、size 为 1–100；可按 taskId 和 status 筛选。
- GET /summary：当前租户的 total / pending / blocked / failed / delivered 统计。
- GET /{eventId}：投递元数据，不返回事件 payload、平台令牌或 endpoint。
- GET /{eventId}/retries：分页人工重试审计。
- POST /{eventId}/retries：人工重试，必须提供 Idempotency-Key 和 JSON `{ "expectedAttempts": 1, "reason": "接收端已恢复" }`。

状态互斥，判定优先级为：delivered（已确认）→ blocked（存在同任务未确认的低版本事件）→ failed（last_error 非空）→ pending（待调度）。blockedByEventId 指向最早未确认前序事件。自动重试等待期间仍显示 failed，不与调度时间混为一谈。

## 人工重试约束

只接受未确认、无前序阻塞、已有失败记录的事件。必须填写去除首尾空白后非空、最多 2000 字符的原因。expectedAttempts 必须与最新失败计数一致。请求对事件加行锁，和自动投递串行执行；已确认事件不得重发，也不得越过前序事件。

成功返回 200 和重试审计回执，同一事务把 available_at 调整为当前时间、清除 last_error，并写入重试人、原因、此前失败代码、失败计数及时间。保留 attempts、eventId、payload、业务版本和业务处理记录。该操作只安排下一次调度，不保证平台已经收到；投递器关闭时仍需启用投递器。

同租户幂等键空间与任务命令共用，相同主体和相同请求重放返回原回执，即使事件随后已确认。键复用为其他命令、其他主体或不同请求时返回 409 IDEMPOTENCY_CONFLICT。失败请求不留下成功回执或重试审计。

错误为 400 INVALID_REQUEST / INVALID_IDEMPOTENCY_KEY，401 UNAUTHENTICATED / INVALID_IDENTITY，403 FORBIDDEN，404 EVENT_NOT_FOUND；409 DELIVERY_VERSION_CONFLICT、EVENT_ALREADY_DELIVERED、EVENT_BLOCKED、EVENT_NOT_RETRYABLE、IDEMPOTENCY_CONFLICT。标准错误体沿用 code / message / requestId。

## 数据迁移与回滚

Flyway V2 增加投递重试审计表、租户查询索引及审计外键，保留 V1 和现有 outbox 数据。应用回退可保留 V2 新表，旧代码不依赖它；不通过删除审计记录回滚业务。
