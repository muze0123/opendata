package com.metritag.opendata.platform.infrastructure;

import com.metritag.opendata.platform.application.DeliveryStore;
import com.metritag.opendata.platform.domain.DeliveryModels.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.util.*;

@Repository
public class JdbcDeliveryStore implements DeliveryStore {
    private final JdbcTemplate jdbc;
    public JdbcDeliveryStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final String PROJECTION = """
        WITH projected AS (
          SELECT e.*, e.payload->>'eventType' AS event_type,
            (SELECT p.event_id FROM task_outbox p WHERE p.tenant_id=e.tenant_id AND p.task_id=e.task_id
             AND p.aggregate_version<e.aggregate_version AND p.delivered_at IS NULL
             ORDER BY p.aggregate_version LIMIT 1) AS blocked_by
          FROM task_outbox e WHERE e.tenant_id=?
        ), classified AS (
          SELECT *, CASE WHEN delivered_at IS NOT NULL THEN 'delivered'
            WHEN blocked_by IS NOT NULL THEN 'blocked' WHEN last_error IS NOT NULL THEN 'failed'
            ELSE 'pending' END AS delivery_status FROM projected
        )
        """;
    private static final RowMapper<Event> EVENT = (row, index) -> new Event(row.getObject("event_id", UUID.class),
        row.getObject("task_id", UUID.class), row.getLong("aggregate_version"), row.getString("event_type"),
        row.getString("delivery_status"), row.getInt("attempts"), row.getTimestamp("available_at").toInstant(),
        row.getTimestamp("delivered_at") == null ? null : row.getTimestamp("delivered_at").toInstant(),
        row.getString("last_error"), row.getObject("blocked_by", UUID.class));
    private static final RowMapper<RetryReceipt> RETRY = (row, index) -> new RetryReceipt(row.getObject("id", UUID.class),
        row.getObject("event_id", UUID.class), row.getString("requested_by"), row.getString("reason"),
        row.getString("previous_error"), row.getInt("attempts"), row.getTimestamp("requested_at").toInstant());

    @Override public EventPage list(String tenant, UUID taskId, String status, int page, int size) {
        var parameters = new ArrayList<Object>(); parameters.add(tenant);
        String filter = " WHERE true";
        if (taskId != null) { filter += " AND task_id=?"; parameters.add(taskId); }
        if (!status.isEmpty()) { filter += " AND delivery_status=?"; parameters.add(status); }
        long total = jdbc.queryForObject(PROJECTION + "SELECT count(*) FROM classified" + filter, Long.class, parameters.toArray());
        parameters.add(size); parameters.add((long) page * size);
        var items = jdbc.query(PROJECTION + "SELECT * FROM classified" + filter + " ORDER BY available_at DESC,event_id LIMIT ? OFFSET ?", EVENT, parameters.toArray());
        return new EventPage(items, total, page, size);
    }
    @Override public Summary summary(String tenant) {
        return jdbc.queryForObject(PROJECTION + """
            SELECT count(*), count(*) FILTER (WHERE delivery_status='pending'), count(*) FILTER (WHERE delivery_status='blocked'),
                count(*) FILTER (WHERE delivery_status='failed'), count(*) FILTER (WHERE delivery_status='delivered') FROM classified
            """, (row, index) -> new Summary(row.getLong(1), row.getLong(2), row.getLong(3), row.getLong(4), row.getLong(5)), tenant);
    }
    @Override public Optional<Event> find(String tenant, UUID eventId, boolean lock) {
        if (lock && jdbc.query("SELECT event_id FROM task_outbox WHERE tenant_id=? AND event_id=? FOR UPDATE",
            (row, index) -> row.getObject(1, UUID.class), tenant, eventId).isEmpty()) return Optional.empty();
        return jdbc.query(PROJECTION + "SELECT * FROM classified WHERE event_id=?", EVENT, tenant, eventId).stream().findFirst();
    }
    @Override public RetryPage retries(String tenant, UUID eventId, int page, int size) {
        long total = jdbc.queryForObject("SELECT count(*) FROM task_outbox_retry_log WHERE tenant_id=? AND event_id=?", Long.class, tenant, eventId);
        var items = jdbc.query("SELECT * FROM task_outbox_retry_log WHERE tenant_id=? AND event_id=? ORDER BY requested_at DESC,id LIMIT ? OFFSET ?",
            RETRY, tenant, eventId, size, (long) page * size);
        return new RetryPage(items, total, page, size);
    }
    @Override public Receipt reserve(String tenant, String key, String hash) {
        jdbc.update("INSERT INTO command_receipt(tenant_id,command_key,request_hash) VALUES (?,?,?) ON CONFLICT DO NOTHING", tenant, key, hash);
        return jdbc.queryForObject("SELECT request_hash,response_body::text FROM command_receipt WHERE tenant_id=? AND command_key=? FOR UPDATE",
            (row, index) -> new Receipt(row.getString(1), row.getString(2)), tenant, key);
    }
    @Override public void finish(String tenant, String key, String response) {
        jdbc.update("UPDATE command_receipt SET response_body=CAST(? AS jsonb) WHERE tenant_id=? AND command_key=?", response, tenant, key);
    }
    @Override public void reschedule(String tenant, RetryReceipt receipt) {
        jdbc.update("UPDATE task_outbox SET available_at=?,last_error=NULL WHERE tenant_id=? AND event_id=?",
            Timestamp.from(receipt.requestedAt()), tenant, receipt.eventId());
        jdbc.update("""
            INSERT INTO task_outbox_retry_log(id,tenant_id,event_id,requested_by,reason,previous_error,attempts,requested_at)
            VALUES (?,?,?,?,?,?,?,?)
            """, receipt.id(), tenant, receipt.eventId(), receipt.requestedBy(), receipt.reason(), receipt.previousError(),
            receipt.attempts(), Timestamp.from(receipt.requestedAt()));
    }
}
