package com.metritag.opendata.platform;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Service
public class OutboxPublisher {
    private final JdbcTemplate jdbc;
    private final PlatformTaskPort platform;
    public OutboxPublisher(JdbcTemplate jdbc, PlatformTaskPort platform) { this.jdbc = jdbc; this.platform = platform; }
    private record Event(UUID id, String payload, int attempts) {}

    @Transactional
    public boolean publishNext() {
        var candidates = jdbc.query("""
            SELECT e.event_id, e.payload::text, e.attempts FROM task_outbox e
            WHERE e.delivered_at IS NULL AND e.available_at <= now()
            AND NOT EXISTS (SELECT 1 FROM task_outbox p WHERE p.task_id=e.task_id
                AND p.aggregate_version < e.aggregate_version AND p.delivered_at IS NULL)
            ORDER BY e.available_at,e.event_id LIMIT 1 FOR UPDATE OF e SKIP LOCKED
            """, (row, index) -> new Event(row.getObject(1, UUID.class), row.getString(2), row.getInt(3)));
        if (candidates.isEmpty()) return false;
        var event = candidates.getFirst();
        try {
            platform.publish(event.id(), event.payload());
            jdbc.update("UPDATE task_outbox SET delivered_at=now(),last_error=NULL WHERE event_id=?", event.id());
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            int attempts = Math.min(event.attempts() + 1, 1000000);
            long delaySeconds = Math.min(300L, 1L << Math.min(attempts, 8));
            // Persist a stable code or exception type, excluding upstream bodies and credentials.
            jdbc.update("UPDATE task_outbox SET attempts=?,available_at=?,last_error=? WHERE event_id=?",
                attempts, Timestamp.from(Instant.now().plusSeconds(delaySeconds)), error instanceof PlatformDeliveryException failure ? failure.code() : error.getClass().getSimpleName(), event.id());
        }
        return true;
    }
}
