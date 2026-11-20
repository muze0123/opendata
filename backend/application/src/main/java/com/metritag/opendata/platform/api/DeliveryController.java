package com.metritag.opendata.platform.api;

import com.metritag.opendata.platform.application.DeliveryService;
import com.metritag.opendata.platform.domain.DeliveryModels.*;
import com.metritag.opendata.security.RequestIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/opendata/v1/platform/task-events")
public class DeliveryController {
    private final DeliveryService deliveries;
    public DeliveryController(DeliveryService deliveries) { this.deliveries = deliveries; }
    @GetMapping public EventPage list(Authentication auth, @RequestParam(required=false) UUID taskId,
        @RequestParam(defaultValue="") @Pattern(regexp="|pending|blocked|failed|delivered") String status,
        @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page,
        @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return deliveries.list(RequestIdentity.actor(auth), taskId, status, page, size);
    }
    @GetMapping("/summary") public Summary summary(Authentication auth) { return deliveries.summary(RequestIdentity.actor(auth)); }
    @GetMapping("/{id}") public Event get(Authentication auth, @PathVariable UUID id) { return deliveries.get(RequestIdentity.actor(auth), id); }
    @GetMapping("/{id}/retries") public RetryPage retries(Authentication auth, @PathVariable UUID id,
        @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page,
        @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return deliveries.retries(RequestIdentity.actor(auth), id, page, size);
    }
    @PostMapping("/{id}/retries") public RetryReceipt retry(Authentication auth, @PathVariable UUID id,
        @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody Retry request) {
        return deliveries.retry(RequestIdentity.actor(auth), id, key, request);
    }
}
