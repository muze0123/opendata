package com.metritag.opendata.platform.domain;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class DeliveryModels {
    private DeliveryModels() {}
    public record Event(UUID eventId, UUID taskId, long aggregateVersion, String eventType, String status,
        int attempts, Instant availableAt, Instant deliveredAt, String lastError, UUID blockedByEventId) {}
    public record EventPage(List<Event> items, long total, int page, int size) {}
    public record Summary(long total, long pending, long blocked, long failed, long delivered) {}
    public record Retry(@NotNull @Min(0) Integer expectedAttempts, @NotBlank @Size(max=2000) String reason) {}
    public record RetryReceipt(UUID id, UUID eventId, String requestedBy, String reason, String previousError,
        int attempts, Instant requestedAt) {}
    public record RetryPage(List<RetryReceipt> items, long total, int page, int size) {}
}
