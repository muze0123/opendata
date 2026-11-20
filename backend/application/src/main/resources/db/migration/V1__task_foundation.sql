CREATE TABLE platform_root_reference (
    tenant_id varchar(128) NOT NULL,
    platform_code varchar(64) NOT NULL,
    root_task_id varchar(128) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, platform_code, root_task_id)
);
CREATE TABLE platform_node_reference (
    tenant_id varchar(128) NOT NULL,
    platform_code varchar(64) NOT NULL,
    node_task_id varchar(128) NOT NULL,
    root_task_id varchar(128) NOT NULL,
    workflow_instance_id varchar(128) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, platform_code, node_task_id),
    UNIQUE (tenant_id, platform_code, node_task_id, root_task_id, workflow_instance_id),
    FOREIGN KEY (tenant_id, platform_code, root_task_id)
        REFERENCES platform_root_reference (tenant_id, platform_code, root_task_id)
);
CREATE TABLE business_task (
    id uuid PRIMARY KEY,
    tenant_id varchar(128) NOT NULL,
    platform_code varchar(64) NOT NULL,
    root_task_id varchar(128) NOT NULL,
    node_task_id varchar(128) NOT NULL,
    workflow_instance_id varchar(128) NOT NULL,
    business_key varchar(128) NOT NULL,
    business_type varchar(64) NOT NULL,
    title varchar(200) NOT NULL,
    description varchar(4000) NOT NULL,
    creator_id varchar(128) NOT NULL,
    assignee_id varchar(128) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('pending','in-progress','completed','recalled','cancelled')),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    return_count integer NOT NULL DEFAULT 0 CHECK (return_count >= 0),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, platform_code, node_task_id, business_key),
    FOREIGN KEY (tenant_id, platform_code, node_task_id, root_task_id, workflow_instance_id)
        REFERENCES platform_node_reference (tenant_id, platform_code, node_task_id, root_task_id, workflow_instance_id)
);
CREATE INDEX business_task_tenant_created ON business_task (tenant_id, created_at DESC, id);
CREATE INDEX business_task_tenant_status ON business_task (tenant_id, status, created_at DESC);
CREATE TABLE task_action_log (
    id uuid PRIMARY KEY,
    tenant_id varchar(128) NOT NULL,
    task_id uuid NOT NULL,
    action varchar(32) NOT NULL,
    from_status varchar(20),
    to_status varchar(20) NOT NULL,
    operator_id varchar(128) NOT NULL,
    reason varchar(2000) NOT NULL,
    task_version bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    UNIQUE (tenant_id, task_id, task_version),
    FOREIGN KEY (tenant_id, task_id) REFERENCES business_task (tenant_id, id)
);
CREATE TABLE command_receipt (
    tenant_id varchar(128) NOT NULL,
    command_key varchar(128) NOT NULL,
    request_hash char(64) NOT NULL,
    response_body jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, command_key)
);
CREATE TABLE task_outbox (
    event_id uuid PRIMARY KEY,
    tenant_id varchar(128) NOT NULL,
    task_id uuid NOT NULL,
    aggregate_version bigint NOT NULL,
    payload jsonb NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    delivered_at timestamptz,
    last_error varchar(500),
    UNIQUE (tenant_id, task_id, aggregate_version),
    FOREIGN KEY (tenant_id, task_id) REFERENCES business_task (tenant_id, id)
);
CREATE INDEX task_outbox_pending ON task_outbox (available_at, task_id, aggregate_version) WHERE delivered_at IS NULL;
