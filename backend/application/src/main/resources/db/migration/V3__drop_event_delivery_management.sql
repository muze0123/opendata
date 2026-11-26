-- 移除投递事件查询/重试能力的数据库对象（V2 引入，现已下线）。
-- task_outbox 本体与其 V1 索引保留：OutboxPublisher 仍用它将任务事件推送到平台。
DROP TABLE IF EXISTS task_outbox_retry_log;
DROP INDEX IF EXISTS task_outbox_tenant_delivery;
ALTER TABLE task_outbox DROP CONSTRAINT IF EXISTS task_outbox_tenant_event;
