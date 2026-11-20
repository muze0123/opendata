package com.metritag.opendata.security;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
public class SessionController {
    public record SessionView(String tenantId, String userId, List<String> scopes) {}
    @GetMapping("/api/opendata/v1/session")
    public SessionView current(Authentication authentication) {
        var actor = RequestIdentity.actor(authentication);
        var scopes = authentication.getAuthorities().stream().map(value -> value.getAuthority())
            .filter(value -> value.startsWith("SCOPE_")).map(value -> value.substring(6)).sorted().toList();
        return new SessionView(actor.tenantId(), actor.userId(), scopes);
    }
}
