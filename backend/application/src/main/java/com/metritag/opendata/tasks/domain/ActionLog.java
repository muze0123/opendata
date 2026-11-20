package com.metritag.opendata.tasks.domain;

import java.time.Instant;
import java.util.UUID;

public record ActionLog(UUID id, UUID taskId, String action, TaskStatus fromStatus,
    TaskStatus toStatus, String operatorId, String reason, long taskVersion, Instant occurredAt) {}
