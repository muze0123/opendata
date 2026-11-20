package com.metritag.opendata.tasks.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metritag.opendata.shared.DomainException;
import com.metritag.opendata.tasks.application.TaskCommands.*;
import com.metritag.opendata.tasks.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {
    private final TaskStore store;
    private final ObjectMapper json;
    public TaskService(TaskStore store, ObjectMapper json) { this.store = store; this.json = json; }

    @Transactional
    public TaskView dispatch(Actor actor, String key, Dispatch request) {
        if (!actor.platformService()) throw new DomainException(403, "FORBIDDEN", "Platform dispatch permission required");
        var receipt = reserve(actor, key, "dispatch", request);
        if (receipt.response() != null) return decode(receipt.response());
        store.bindParents(actor.tenantId(), request);
        var now = Instant.now();
        var task = new TaskView(UUID.randomUUID(), actor.tenantId(), request.platformCode(), request.rootTaskId(),
            request.nodeTaskId(), request.workflowInstanceId(), request.businessKey(), request.businessType(),
            request.title(), request.description(), request.creatorId(), request.assigneeId(), TaskStatus.PENDING, 0, 0, now, now);
        store.insert(task);
        record(task, null, "received", actor.userId(), "");
        store.finishReceipt(actor.tenantId(), key, encode(task));
        return task;
    }

    @Transactional
    public TaskView act(Actor actor, UUID id, String key, Action request) {
        var receipt = reserve(actor, key, "action:" + id, request);
        if (receipt.response() != null) return decode(receipt.response());
        var task = find(actor, id, true);
        if (task.version() != request.expectedVersion())
            throw new DomainException(409, "VERSION_CONFLICT", "Refresh the task before retrying with a new command key");
        var status = TaskStateMachine.next(task, request.action(), actor, request.reason());
        var next = task.transition(status, request.action() == TaskAction.RETURN, Instant.now());
        store.update(next, task.version());
        record(next, task.status(), request.action().code(), actor.userId(), request.reason());
        store.finishReceipt(actor.tenantId(), key, encode(next));
        return next;
    }

    @Transactional(readOnly=true)
    public TaskView get(Actor actor, UUID id) { return find(actor, id, false); }

    @Transactional(readOnly=true)
    public TaskPage list(Actor actor, TaskStatus status, String keyword, int page, int size) {
        return store.list(actor.tenantId(), status, keyword, page, size);
    }

    @Transactional(readOnly=true)
    public List<ActionLog> actions(Actor actor, UUID id) {
        find(actor, id, false);
        return store.actions(actor.tenantId(), id);
    }

    private TaskView find(Actor actor, UUID id, boolean lock) {
        return store.find(actor.tenantId(), id, lock)
            .orElseThrow(() -> new DomainException(404, "TASK_NOT_FOUND", "Task not found"));
    }
    private TaskStore.Receipt reserve(Actor actor, String key, String operation, Object request) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}"))
            throw new DomainException(400, "INVALID_IDEMPOTENCY_KEY", "A 1-128 character ASCII command key is required");
        String hash;
        try {
            var bytes = MessageDigest.getInstance("SHA-256").digest(
                encode(List.of(actor.userId(), actor.platformService(), operation, request)).getBytes(StandardCharsets.UTF_8));
            hash = HexFormat.of().formatHex(bytes);
        } catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
        var receipt = store.reserve(actor.tenantId(), key, hash);
        if (!hash.equals(receipt.hash())) throw new DomainException(409, "IDEMPOTENCY_CONFLICT", "Command key was used for another request");
        return receipt;
    }
    private void record(TaskView task, TaskStatus before, String action, String operator, String reason) {
        store.log(task, before, action, operator, reason);
        String eventType = switch (action) {
            case "received" -> "task.received";
            case "start" -> "task.started";
            case "complete" -> "task.completed";
            case "return" -> "task.returned";
            case "cancel" -> "task.cancelled";
            case "recall" -> "task.recalled";
            default -> throw new IllegalArgumentException("Unknown action");
        };
        var id = UUID.randomUUID();
        var event = new TaskEvent(id, "1", "opendata", eventType, task.tenantId(), task.id(), task.version(), task.updatedAt(), operator, reason, task);
        store.enqueue(task, id, encode(event));
    }
    public record TaskEvent(UUID eventId, String schemaVersion, String producer, String eventType,
        String tenantId, UUID aggregateId, long aggregateVersion, Instant occurredAt, String actorId, String reason, TaskView data) {}
    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Cannot serialize task data", error); }
    }
    private TaskView decode(String value) {
        try { return json.readValue(value, TaskView.class); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Cannot read command receipt", error); }
    }
}
