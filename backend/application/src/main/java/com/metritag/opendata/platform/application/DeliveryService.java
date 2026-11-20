package com.metritag.opendata.platform.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metritag.opendata.platform.domain.DeliveryModels.*;
import com.metritag.opendata.shared.DomainException;
import com.metritag.opendata.tasks.domain.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class DeliveryService {
    private final DeliveryStore store;
    private final ObjectMapper json;
    public DeliveryService(DeliveryStore store, ObjectMapper json) { this.store = store; this.json = json; }
    @Transactional(readOnly=true)
    public EventPage list(Actor actor, UUID taskId, String status, int page, int size) { return store.list(actor.tenantId(), taskId, status, page, size); }
    @Transactional(readOnly=true)
    public Summary summary(Actor actor) { return store.summary(actor.tenantId()); }
    @Transactional(readOnly=true)
    public Event get(Actor actor, UUID id) { return find(actor, id, false); }
    @Transactional(readOnly=true)
    public RetryPage retries(Actor actor, UUID id, int page, int size) {
        find(actor, id, false); return store.retries(actor.tenantId(), id, page, size);
    }
    @Transactional
    public RetryReceipt retry(Actor actor, UUID id, String key, Retry request) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}")) throw new DomainException(400, "INVALID_IDEMPOTENCY_KEY", "A 1-128 character ASCII command key is required");
        String hash;
        try { hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(List.of(actor.userId(), "event-retry:" + id, request)).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
        var reserved = store.reserve(actor.tenantId(), key, hash);
        if (!hash.equals(reserved.hash())) throw new DomainException(409, "IDEMPOTENCY_CONFLICT", "Command key was used for another request");
        if (reserved.response() != null) {
            try { return json.readValue(reserved.response(), RetryReceipt.class); }
            catch (JsonProcessingException error) { throw new IllegalStateException("Cannot read retry receipt", error); }
        }
        var event = find(actor, id, true);
        if (event.deliveredAt() != null) throw new DomainException(409, "EVENT_ALREADY_DELIVERED", "Confirmed events cannot be resent");
        if (event.blockedByEventId() != null) throw new DomainException(409, "EVENT_BLOCKED", "Deliver the preceding event first");
        if (event.attempts() != request.expectedAttempts()) throw new DomainException(409, "DELIVERY_VERSION_CONFLICT", "Refresh the event before retrying");
        if (event.lastError() == null) throw new DomainException(409, "EVENT_NOT_RETRYABLE", "Only failed events can be rescheduled");
        var receipt = new RetryReceipt(UUID.randomUUID(), id, actor.userId(), request.reason().strip(), event.lastError(), event.attempts(), Instant.now());
        store.reschedule(actor.tenantId(), receipt);
        store.finish(actor.tenantId(), key, encode(receipt));
        return receipt;
    }
    private Event find(Actor actor, UUID id, boolean lock) {
        return store.find(actor.tenantId(), id, lock).orElseThrow(() -> new DomainException(404, "EVENT_NOT_FOUND", "Event not found"));
    }
    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Cannot serialize retry data", error); }
    }
}
