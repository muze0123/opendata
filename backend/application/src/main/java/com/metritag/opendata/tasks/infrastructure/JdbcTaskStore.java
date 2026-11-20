package com.metritag.opendata.tasks.infrastructure;

import com.metritag.opendata.shared.DomainException;
import com.metritag.opendata.tasks.application.TaskStore;
import com.metritag.opendata.tasks.application.TaskCommands.Dispatch;
import com.metritag.opendata.tasks.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcTaskStore implements TaskStore {
    private final JdbcTemplate jdbc;
    public JdbcTaskStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final RowMapper<TaskView> TASK = (row, index) -> new TaskView(
        row.getObject("id", UUID.class), row.getString("tenant_id"), row.getString("platform_code"),
        row.getString("root_task_id"), row.getString("node_task_id"), row.getString("workflow_instance_id"),
        row.getString("business_key"), row.getString("business_type"), row.getString("title"), row.getString("description"),
        row.getString("creator_id"), row.getString("assignee_id"), TaskStatus.from(row.getString("status")),
        row.getLong("version"), row.getInt("return_count"), row.getTimestamp("created_at").toInstant(), row.getTimestamp("updated_at").toInstant());

    @Override public Receipt reserve(String tenant, String key, String hash) {
        jdbc.update("INSERT INTO command_receipt(tenant_id,command_key,request_hash) VALUES (?,?,?) ON CONFLICT DO NOTHING", tenant, key, hash);
        return jdbc.queryForObject("SELECT request_hash,response_body::text FROM command_receipt WHERE tenant_id=? AND command_key=? FOR UPDATE",
            (row, index) -> new Receipt(row.getString(1), row.getString(2)), tenant, key);
    }
    @Override public void finishReceipt(String tenant, String key, String response) {
        jdbc.update("UPDATE command_receipt SET response_body=CAST(? AS jsonb) WHERE tenant_id=? AND command_key=?", response, tenant, key);
    }
    @Override public void bindParents(String tenant, Dispatch request) {
        jdbc.update("INSERT INTO platform_root_reference(tenant_id,platform_code,root_task_id) VALUES (?,?,?) ON CONFLICT DO NOTHING",
            tenant, request.platformCode(), request.rootTaskId());
        jdbc.update("INSERT INTO platform_node_reference(tenant_id,platform_code,node_task_id,root_task_id,workflow_instance_id) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING",
            tenant, request.platformCode(), request.nodeTaskId(), request.rootTaskId(), request.workflowInstanceId());
        boolean matches = Boolean.TRUE.equals(jdbc.queryForObject("SELECT root_task_id=? AND workflow_instance_id=? FROM platform_node_reference WHERE tenant_id=? AND platform_code=? AND node_task_id=?",
            Boolean.class, request.rootTaskId(), request.workflowInstanceId(), tenant, request.platformCode(), request.nodeTaskId()));
        if (!matches) throw new DomainException(409, "PARENT_BINDING_CONFLICT", "A platform node cannot be rebound to another parent or workflow instance");
    }
    @Override public void insert(TaskView t) {
        jdbc.update("""
            INSERT INTO business_task(id,tenant_id,platform_code,root_task_id,node_task_id,workflow_instance_id,
                business_key,business_type,title,description,creator_id,assignee_id,status,version,return_count,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, t.id(), t.tenantId(), t.platformCode(), t.rootTaskId(), t.nodeTaskId(), t.workflowInstanceId(),
            t.businessKey(), t.businessType(), t.title(), t.description(), t.creatorId(), t.assigneeId(), t.status().code(),
            t.version(), t.returnCount(), Timestamp.from(t.createdAt()), Timestamp.from(t.updatedAt()));
    }
    @Override public Optional<TaskView> find(String tenant, UUID id, boolean lock) {
        return jdbc.query("SELECT * FROM business_task WHERE tenant_id=? AND id=?" + (lock ? " FOR UPDATE" : ""), TASK, tenant, id).stream().findFirst();
    }
    @Override public void update(TaskView task, long expectedVersion) {
        int count = jdbc.update("UPDATE business_task SET status=?,version=?,return_count=?,updated_at=? WHERE tenant_id=? AND id=? AND version=?",
            task.status().code(), task.version(), task.returnCount(), Timestamp.from(task.updatedAt()), task.tenantId(), task.id(), expectedVersion);
        if (count != 1) throw new DomainException(409, "VERSION_CONFLICT", "Task was changed by another operation");
    }
    @Override public TaskPage list(String tenant, TaskStatus status, String keyword, int page, int size) {
        var parameters = new java.util.ArrayList<Object>();
        parameters.add(tenant);
        String filter = " WHERE tenant_id=?";
        if (status != null) { filter += " AND status=?"; parameters.add(status.code()); }
        if (!keyword.isEmpty()) {
            filter += " AND strpos(lower(title || ' ' || business_key || ' ' || root_task_id || ' ' || node_task_id),lower(?)) > 0";
            parameters.add(keyword);
        }
        long total = jdbc.queryForObject("SELECT count(*) FROM business_task" + filter, Long.class, parameters.toArray());
        parameters.add(size); parameters.add((long) page * size);
        var items = jdbc.query("SELECT * FROM business_task" + filter + " ORDER BY created_at DESC,id LIMIT ? OFFSET ?", TASK, parameters.toArray());
        return new TaskPage(items, total, page, size);
    }
    @Override public void log(TaskView task, TaskStatus previous, String action, String operator, String reason) {
        jdbc.update("INSERT INTO task_action_log(id,tenant_id,task_id,action,from_status,to_status,operator_id,reason,task_version,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            UUID.randomUUID(), task.tenantId(), task.id(), action, previous == null ? null : previous.code(), task.status().code(), operator, reason, task.version(), Timestamp.from(task.updatedAt()));
    }
    @Override public List<ActionLog> actions(String tenant, UUID id) {
        return jdbc.query("SELECT * FROM task_action_log WHERE tenant_id=? AND task_id=? ORDER BY task_version", (row, index) -> new ActionLog(
            row.getObject("id", UUID.class), row.getObject("task_id", UUID.class), row.getString("action"),
            row.getString("from_status") == null ? null : TaskStatus.from(row.getString("from_status")), TaskStatus.from(row.getString("to_status")),
            row.getString("operator_id"), row.getString("reason"), row.getLong("task_version"), row.getTimestamp("occurred_at").toInstant()), tenant, id);
    }
    @Override public void enqueue(TaskView task, UUID eventId, String payload) {
        jdbc.update("INSERT INTO task_outbox(event_id,tenant_id,task_id,aggregate_version,payload) VALUES (?,?,?,?,CAST(? AS jsonb))",
            eventId, task.tenantId(), task.id(), task.version(), payload);
    }
}
