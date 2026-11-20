# OpenData 业务后端

业务后端采用 Java 21、Spring Boot 3.5.16、PostgreSQL 17、Flyway 和 Maven。以单应用模块化单体起步，tasks 包划分 api / application / domain / infrastructure，platform 包持有出站端口、HTTP 适配和 outbox 投递器，security / shared 提供认证和统一错误处理。

`backend/pom.xml` 聚合新 application 模块。既有 workflow 与 warmflow 保持独立工程和端口，新服务默认使用 4320。

## 契约阅读顺序

1. ../contracts/tasks/01-data-model.md
2. ../contracts/tasks/02-state-machine.md
3. ../contracts/tasks/03-platform-contract.md
4. ../contracts/tasks/openapi.json 与 task-event.schema.json

API 支持三级关联的业务任务接收、租户范围查询、分页、办理和操作记录。平台实际事件接收端仍待联调，HTTP 适配器对缺少配置、错误回执与失败响应均保留待发事件。

## 构建与验证

工程根目录运行 `pnpm backend:verify`，或 `mvn -B -f backend/pom.xml verify`。测试启动隔离的真实 PostgreSQL 17，使用 Flyway 创建表，结束时清理。首次运行需要下载 Maven 依赖和对应系统的 PostgreSQL 测试二进制。测试使用无生产数据的临时数据库。

测试覆盖任务闭环、退回、取消撤回、请求校验、租户隔离、权限、并发版本冲突、幂等重放、父级关联不可变、outbox 失败重试与事件顺序，以及 API / 事件 Schema 和 Java record 的字段一致性。

## 本地 PostgreSQL 启动

先配置密码与开发令牌，再启动数据库和应用。以下命令在工程根目录执行。

```bash
export OPENDATA_DATABASE_PASSWORD="$(openssl rand -hex 24)"
export OPENDATA_DEV_TOKEN="$(openssl rand -hex 24)"
docker compose -f deploy/compose.backend.yml up -d postgres
pnpm backend:local
```

数据库使用独立的 Docker volume。数据库 URL、用户名、密码通过 OPENDATA_DATABASE_URL / OPENDATA_DATABASE_USER / OPENDATA_DATABASE_PASSWORD 配置。默认数据库 URL 为 jdbc:postgresql://127.0.0.1:5432/opendata。

无 Docker 的开发环境也可运行 `pnpm backend:dev`，使用本机 PostgreSQL 测试二进制和显式 local profile 启动。数据目录由 OPENDATA_LOCAL_DATA_DIR 指定，默认保存在 backend/application/.local-data/postgres。该入口使用 test classpath，正式部署使用打包后的 application.jar。

## 验证 API

```bash
curl http://127.0.0.1:4320/actuator/health
curl -X POST http://127.0.0.1:4320/api/opendata/v1/tasks \
  -H "Authorization: Bearer $OPENDATA_DEV_TOKEN" \
  -H 'X-Dev-Tenant: local-tenant' -H 'X-Dev-User: local-platform' \
  -H 'Idempotency-Key: receive-example-1' -H 'Content-Type: application/json' \
  --data '{"platformCode":"tianshu","rootTaskId":"root-1","nodeTaskId":"node-1","workflowInstanceId":"instance-1","businessKey":"assessment-1","businessType":"assessment","title":"本地联调任务","description":"","creatorId":"alice","assigneeId":"alice"}'
```

根据响应 id 调用 POST /api/opendata/v1/tasks/{id}/actions，先发送 `{"action":"start","expectedVersion":0,"reason":""}`，再使用新 Idempotency-Key 发送 `{"action":"complete","expectedVersion":1,"reason":""}`，操作者使用 X-Dev-User: alice。失败可使用相同幂等键和相同请求重试。客户端改变请求时必须换键。

## 正式平台配置

默认 profile 要求 PLATFORM_JWT_ISSUER、PLATFORM_JWK_SET_URI，校验 audience 默认为 opendata。JWT 使用 tenant_id、sub 和 scope。local profile 的共享开发令牌只用于回环地址调试。

配置 PLATFORM_TASK_EVENT_ENDPOINT、PLATFORM_SERVICE_TOKEN 并设置 OPENDATA_OUTBOX_ENABLED=true 后开启发送。平台按 eventId 去重并返回匹配回执。每个任务按版本顺序发送，失败持续重试且间隔最大 300 秒。日志只记录异常类型和请求 ID，outbox 保存固定失败代码，运维可查询 task_outbox 的 attempts / available_at / last_error。

`pnpm backend:package` 打包，`pnpm backend:run` 使用已配置 PostgreSQL 与正式 JWT 启动。Docker 镜像构建使用 `docker build -f deploy/Dockerfile.backend -t opendata-backend .`。Compose 的 app profile 运行 application 服务时需要上述平台配置。

## 实现边界

本期提供任务基础闭环与平台联调基础。文件上传、主数据、消息通知、用户目录、转交和审批编排执行在对应服务契约明确后接入。前端业务任务列表和详情已连接本服务，支持查询、分页、处理记录与状态办理；原平台主任务页面与既有流程服务继续使用原入口。平台统一登录仍待接入。Flyway 迁移只作用于新业务 PostgreSQL 数据库。

## 2026-11-20 验证记录

- `pnpm backend:verify` 已通过，11 项测试全部成功，其中 9 项为 PostgreSQL 集成测试、1 项为真实 JWT 签名校验测试、1 项为契约一致性测试。
- `pnpm backend:dev` 已实际启动，健康检查、任务接收、开始、完成和跨租户拒绝均通过真实 HTTP 验证。
- 关闭并重启应用与本地 PostgreSQL 后，已完成任务的状态、版本和三条操作记录均保留。
- 既有 Node.js 流程测试为 11 项成功、1 项按原条件跳过。
- 本机通过原生 PostgreSQL 测试二进制验证。Docker Compose 与镜像配置已提供，容器构建运行待 Docker 环境验证。平台真实接收端、正式 issuer / JWK 与生产统一登录仍需后续联调。

## 前端业务任务联调

工程根目录运行 `pnpm dev:business` 可联合启动本机 PostgreSQL、业务服务与前端。开发令牌由启动脚本生成并保留在服务进程环境中，Vite 在服务端代理请求，浏览器仅持有现有前端登录入口的开发会话。OPENDATA_DEV_TENANT / OPENDATA_DEV_USER 默认为 local-tenant / alice，和 API 调试身份保持一致。

业务任务入口为 `/tasks/business`，详情为 `/tasks/business/:id`。关键词和状态筛选、分页保存在路由查询参数中。办理按当前版本提交，发生冲突时刷新任务；请求结果未知时保留幂等键以便安全重试。

运行 `pnpm test:business`，在独立临时 PostgreSQL 数据库和随机空闲端口验证浏览器到数据库的实际流程。测试不会导入现有任务数据或清空开发数据库。生产构建与 preview 不注入本地开发令牌。

### 业务任务联调验证

- 后端 Maven 验证 11 项通过；前端 verify、build、design:audit 通过。
- `pnpm test:business` 的 10 组浏览器验证通过，使用真实 PostgreSQL；覆盖查询分页、状态筛选、丢失响应后的幂等重试、原因校验、退回、版本冲突、完成与刷新、负责人入口、错误恢复。中英文、深浅主题和 1440 / 900 / 375 宽度均已执行，窄屏原因弹窗也已检查。
- 修复共享分页下拉框的原生 label 重复触发问题。共享组件浏览器 DOM / 样式 / 交互检查 75 项通过（`pnpm --dir frontend design:browser --no-screenshots`）。默认截图基线比较未通过，当前截图与既有基线有差异，本期保留原基线，未自动覆盖。
- 共享设计文件只读同步检查发现 HMG 的现有差异，以及合规自评旧路径不可用；本期后端联调未向其他项目写入文件。
- 真实平台 JWT / 接收端及生产统一登录仍待配置；Docker 容器运行仍待可用环境验证。
