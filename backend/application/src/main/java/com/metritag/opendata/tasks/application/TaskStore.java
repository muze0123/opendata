package com.metritag.opendata.tasks.application;

import com.metritag.opendata.tasks.application.TaskCommands.Dispatch;
import com.metritag.opendata.tasks.domain.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskStore {
    record Receipt(String hash, String response) {}
    Receipt reserve(String tenant, String key, String hash);
    void finishReceipt(String tenant, String key, String response);
    void bindParents(String tenant, Dispatch request);
    void insert(TaskView task);
    Optional<TaskView> find(String tenant, UUID id, boolean lock);
    void update(TaskView task, long expectedVersion);
    TaskPage list(String tenant, TaskStatus status, String keyword, int page, int size);
    void log(TaskView task, TaskStatus previous, String action, String operator, String reason);
    List<ActionLog> actions(String tenant, UUID id);
    void enqueue(TaskView task, UUID eventId, String payload);
}
