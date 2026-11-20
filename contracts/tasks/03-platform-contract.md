# 平台接口与适配边界 v0.1

入站任务 API 已在新业务工程实现。出站平台接收端是本项目提出的联调契约，平台侧实际路径、鉴权配置和回调策略需要双方对齐后接入。

## 认证与租户

正式配置采用 OAuth2 JWT Resource Server，首版接受 RS256 签名。校验 issuer、签名、有效期和 audience=opendata，tenant_id 与 sub 分别作为租户及主体。scope 使用 opendata.tasks.read、opendata.tasks.write、opendata.tasks.dispatch。

仅显式 local profile 提供共享开发令牌，通过 OPENDATA_DEV_TOKEN 配置。请求带 Authorization Bearer 和 X-Dev-Tenant / X-Dev-User。该模式授予本地调试权限，服务绑定回环地址。默认正式配置要求平台 issuer 与 JWK URI。

## 入站 API

基础路径 `/api/opendata/v1`。完整字段和响应定义见 openapi.json。

| 方法与路径 | 用途 | 必需 scope |
| --- | --- | --- |
| POST /tasks | 平台分发第三级业务任务，201 | dispatch |
| GET /session | 当前认证主体、租户与 scope，供界面控制操作入口 | read |
| GET /tasks?page=0&size=20 | 当前租户分页查询，可传 status 和 q | read |
| GET /tasks/{id} | 当前租户任务详情 | read |
| GET /tasks/{id}/actions | 操作记录 | read |
| POST /tasks/{id}/actions | 按状态机办理，200 | write 或 dispatch |

查询 q 最长 200 字符，去除首尾空格后，对任务标题、业务编号、平台主任务 ID 和节点任务 ID 做不区分大小写的字面子串匹配；百分号和下划线不作为通配符。查询始终限制在当前租户，按创建时间、ID 降序稳定分页。

界面可使用 GET /session 的主体与 scope 决定可见入口；每次办理仍由后端执行状态、负责人、权限和版本校验。

POST 必须提供 Idempotency-Key，最长 128 字符。请求校验失败为 400，缺少认证为 401，scope / 操作者不满足为 403，不存在或其他租户对象为 404，版本、状态或幂等冲突为 409。错误返回 code、message、requestId。服务异常为 500，数据库与内部异常细节保留在服务端。

业务负责人和 creatorId 是平台提供的租户内稳定用户 ID。平台分发方负责用户归属核验，普通办理方不能改写这些字段。标题最长 200 字符，说明最长 4000 字符，办理原因最长 2000 字符。

## 出站事件

`PlatformTaskPort` 是应用层对平台的依赖端口，HTTP 适配器接收配置的完整 endpoint 和服务令牌。默认关闭投递，配置 endpoint 与 token 并开启 outbox 后开始发送。

发送 POST，Content-Type 为 application/json，Authorization 使用服务令牌，Idempotency-Key 使用 eventId。平台以 JSON `{ "eventId": "同一事件ID", "accepted": true }` 确认，HTTP 200 或 202。仅 HTTP 成功但没有匹配回执时继续按失败重试。

消息格式见 task-event.schema.json。eventType 为 task.received / task.started / task.completed / task.returned / task.cancelled / task.recalled。消息携带 tenantId、producer、aggregateId、aggregateVersion、occurredAt、actorId、reason 和任务数据，数据中包含主任务、节点和流程实例引用。

同任务前序事件确认后才投递后续事件。数据库 FOR UPDATE SKIP LOCKED 避免多个投递器同时领取，事务跨 HTTP 调用持有记录锁，连接及请求均设置超时。失败采用有上限间隔的持续重试，远端已接收而本地提交失败时可能重发同一 eventId，平台须按 eventId 去重。本机制提供至少一次投递。

## 平台能力拆分

| 能力 | 适配边界 / 当前状态 |
| --- | --- |
| 身份与租户 | JWT 标准校验已实现，平台 issuer / JWK / audience 待配置 |
| 任务分发与回传 | 入站持久化与出站 HTTP 适配已实现，实际平台接收端待联调 |
| 流程引擎 | 现有 workflow / warmflow 独立运行，业务服务通过关联 ID 引用 |
| 成员目录、文件、通知、编号、主数据 | 本期保留服务边界，后续按批准契约增加端口 |

本期不把前端 sessionStorage 中的 mock 任务自动导入业务数据库，也不把开发令牌当作平台身份凭据。
