package com.metritag.opendata.platform.application;

import com.metritag.opendata.platform.domain.DeliveryModels.*;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryStore {
    record Receipt(String hash, String response) {}
    EventPage list(String tenant, UUID taskId, String status, int page, int size);
    Summary summary(String tenant);
    Optional<Event> find(String tenant, UUID eventId, boolean lock);
    RetryPage retries(String tenant, UUID eventId, int page, int size);
    Receipt reserve(String tenant, String key, String hash);
    void finish(String tenant, String key, String response);
    void reschedule(String tenant, RetryReceipt receipt);
}
