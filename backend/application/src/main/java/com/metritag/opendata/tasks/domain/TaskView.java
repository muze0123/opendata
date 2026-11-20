package com.metritag.opendata.tasks.domain;

import java.time.Instant;
import java.util.UUID;

public record TaskView(UUID id, String tenantId, String platformCode, String rootTaskId,
    String nodeTaskId, String workflowInstanceId, String businessKey, String businessType,
    String title, String description, String creatorId, String assigneeId, TaskStatus status,
    long version, int returnCount, Instant createdAt, Instant updatedAt) {

    public TaskView transition(TaskStatus next, boolean returned, Instant now) {
        return new TaskView(id, tenantId, platformCode, rootTaskId, nodeTaskId, workflowInstanceId,
            businessKey, businessType, title, description, creatorId, assigneeId, next,
            version + 1, returnCount + (returned ? 1 : 0), createdAt, now);
    }
}
