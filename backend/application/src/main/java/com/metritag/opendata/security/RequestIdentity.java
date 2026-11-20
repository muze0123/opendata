package com.metritag.opendata.security;

import com.metritag.opendata.shared.DomainException;
import com.metritag.opendata.tasks.domain.Actor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

public final class RequestIdentity {
    private RequestIdentity() {}
    public record LocalUser(String tenantId, String userId) {}
    public static Actor actor(Authentication authentication) {
        String tenant;
        String user;
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            Object claim = jwt.getClaims().get("tenant_id");
            tenant = claim instanceof String value ? value : null;
            user = jwt.getSubject();
        } else if (authentication.getPrincipal() instanceof LocalUser local) {
            tenant = local.tenantId(); user = local.userId();
        } else throw new DomainException(401, "UNAUTHENTICATED", "Authentication required");
        if (tenant == null || tenant.isBlank() || tenant.length() > 128 || user == null || user.isBlank() || user.length() > 128)
            throw new DomainException(401, "INVALID_IDENTITY", "Valid tenant_id and subject claims are required");
        boolean service = authentication.getAuthorities().stream().anyMatch(value -> value.getAuthority().equals("SCOPE_opendata.tasks.dispatch"));
        return new Actor(tenant, user, service);
    }
}
