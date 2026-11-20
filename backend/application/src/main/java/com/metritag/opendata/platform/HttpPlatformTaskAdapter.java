package com.metritag.opendata.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.UUID;

@Component
public class HttpPlatformTaskAdapter implements PlatformTaskPort {
    private final String endpoint;
    private final String token;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public HttpPlatformTaskAdapter(@Value("${opendata.platform.event-endpoint}") String endpoint,
        @Value("${opendata.platform.service-token}") String token, ObjectMapper json) {
        this.endpoint = endpoint;
        this.token = token;
        this.json = json;
    }
    @Override public void publish(UUID eventId, String payload) throws Exception {
        if (endpoint.isBlank() || token.isBlank()) throw new PlatformDeliveryException("PLATFORM_NOT_CONFIGURED");
        var request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(5))
            .header("Content-Type", "application/json").header("Authorization", "Bearer " + token)
            .header("Idempotency-Key", eventId.toString()).POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        var response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 && response.statusCode() != 202)
            throw new PlatformDeliveryException("PLATFORM_HTTP_" + response.statusCode());
        var receipt = json.readTree(response.body());
        if (!eventId.toString().equals(receipt.path("eventId").asText()) || !receipt.path("accepted").asBoolean())
            throw new PlatformDeliveryException("PLATFORM_ACK_MISMATCH");
    }
}
