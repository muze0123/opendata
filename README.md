# OpenData

## 工程结构

- `frontend/`：Vue 3 前端、设计规范、检查脚本及独立 pnpm 锁文件。
- `backend/application/`：Java 21 / Spring Boot / PostgreSQL / Flyway 业务后端，三级任务契约与任务基础闭环。
- `backend/workflow/`：现有 Node.js 流程接口及测试。
- `backend/warmflow/`：现有 Java 21 / Spring Boot / WarmFlow Maven 工程，包含源码、资源、数据库初始化脚本与测试。
- `contracts/`：接口与事件契约。
- `deploy/`：部署配置。
- `scripts/`：前后端联合启动及原生流程集成验证。

## 常用命令

在工程根目录运行：

```bash
pnpm install:frontend
pnpm dev
pnpm verify
pnpm build
pnpm design:browser
pnpm design:audit
pnpm test:workflow
pnpm dev:workflow
```

`pnpm dev` 仅启动前端。`pnpm dev:workflow` 联合启动 Java 流程引擎、Node.js 接口及前端，需要 Maven 和 Java 21。前端仍通过 `/api/workflow` 代理访问本地 4318 端口。

单独启动服务和执行原生集成测试：

```bash
pnpm workflow:server
pnpm workflow:warmflow
pnpm test:workflow:native
```

Java 服务需要 `WARMFLOW_BRIDGE_TOKEN`，联合启动脚本会在未设置时生成临时共享令牌。其他既有环境变量继续生效。

## 部署与数据路径

前端工作目录改为 `frontend/`，安装命令为 `pnpm install --frozen-lockfile`，构建命令为 `pnpm build`，静态发布目录为 `dist`。从工程根目录观察，构建产物为 `frontend/dist/`。

Node.js 流程数据库默认仍位于工程根目录 `.workflow-data/`，可通过 `WORKFLOW_DB` 覆盖。Java 数据库使用既有 `WARMFLOW_DATABASE_URL` 配置，原服务目录及其本地资源一起迁入 `backend/warmflow/`。部署使用的工作目录和 Maven 路径需对应调整。

前端原说明保留于 `frontend/README.md`。现有流程服务与新业务服务具有独立入口；平台接收端联调与生产参数按 contracts/tasks 中的契约推进。

## OpenData 业务后端

阅读 `backend/README.md`，按数据模型、状态机、平台接口契约顺序查看 `contracts/tasks/`。根目录提供 `pnpm backend:verify`、`pnpm backend:local`、`pnpm backend:dev`、`pnpm backend:package` 和 `pnpm backend:run`。部署文件位于 `deploy/compose.backend.yml` 与 `deploy/Dockerfile.backend`。

## 业务任务联合开发

运行 `pnpm dev:business`，启动本机 PostgreSQL、Java 业务服务和前端，访问 http://127.0.0.1:5173/tasks/business 。首次需要下载 Maven 依赖。现有登录页可使用开发账号 admin / admin；该登录仍是前端开发入口，业务接口使用独立的 local profile 身份。

脚本临时生成开发令牌，通过 Vite 服务端代理传递，不写入浏览器或文件。默认本地租户 local-tenant、主体 alice；可通过 OPENDATA_DEV_TENANT / OPENDATA_DEV_USER 配置。前后端端口分别通过 OPENDATA_FRONTEND_PORT / OPENDATA_PORT 覆盖。默认端口被占用时自动选择后续空闲端口，以终端输出地址为准；显式指定的端口发生冲突时给出提示。若已有后端可通过当前 OPENDATA_DEV_TOKEN 认证，脚本复用该服务，退出时不会停止它。若现有本地数据库仍由其他进程使用且无法认证原服务，请在原 backend:dev 终端按 Ctrl+C 后再运行，避免同时启动同一数据目录。数据库保存在 backend/application/.local-data/postgres，默认没有业务任务；使用 backend/README.md 中的分发 API 创建任务。

`pnpm contracts:generate` 根据 OpenAPI 生成业务任务 TypeScript 类型；`pnpm contracts:check` 检查漂移，前端 verify / build 已包含该检查。`pnpm test:business` 使用隔离的真实 PostgreSQL 和浏览器验证业务闭环，证据输出到 frontend/test-results/business-flow，结束时清理测试数据库。

业务任务页面连接 `/api/opendata/v1`。现有 `/tasks` 平台主任务页面保持其原数据入口，通过工具栏进入业务任务；三级任务不混为同一份数据。生产环境需将 `/api/opendata` 反向代理至业务服务，并由平台登录提供正式 JWT。Vite 本地开发身份桥接只在开发服务生效。
