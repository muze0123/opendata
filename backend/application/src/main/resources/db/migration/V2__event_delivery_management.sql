ALTER TABLE task_outbox ADD CONSTRAINT task_outbox_tenant_event UNIQUE (tenant_id, event_id);
CREATE INDEX task_outbox_tenant_delivery ON task_outbox (tenant_id, delivered_at, available_at, event_id);
CREATE TABLE task_outbox_retry_log (
    id uuid PRIMARY KEY,
    tenant_id varchar(128) NOT NULL,
    event_id uuid NOT NULL,
    requested_by varchar(128) NOT NULL,
    reason varchar(2000) NOT NULL CHECK (length(btrim(reason)) > 0),
    previous_error varchar(500) NOT NULL,
    attempts integer NOT NULL CHECK (attempts >= 0),
    requested_at timestamptz NOT NULL,
    FOREIGN KEY (tenant_id, event_id) REFERENCES task_outbox (tenant_id, event_id)
);
CREATE INDEX task_outbox_retry_tenant_event ON task_outbox_retry_log (tenant_id, event_id, requested_at DESC, id);
