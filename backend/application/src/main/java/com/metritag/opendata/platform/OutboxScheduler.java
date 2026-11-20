package com.metritag.opendata.platform;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="opendata.outbox.enabled", havingValue="true")
public class OutboxScheduler {
    private final OutboxPublisher publisher;
    public OutboxScheduler(OutboxPublisher publisher) { this.publisher = publisher; }
    @Scheduled(fixedDelayString="${opendata.outbox.poll-delay-ms:5000}")
    public void sendPending() {
        for (int index = 0; index < 20 && publisher.publishNext(); index++) {
            if (Thread.currentThread().isInterrupted()) return;
        }
    }
}
