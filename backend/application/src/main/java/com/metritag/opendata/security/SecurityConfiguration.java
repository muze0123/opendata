package com.metritag.opendata.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metritag.opendata.shared.ApiErrors;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;

@Configuration
public class SecurityConfiguration {
    @Bean public FilterRegistrationBean<OncePerRequestFilter> requestIds() {
        var filter = new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
                String id = UUID.randomUUID().toString();
                request.setAttribute("requestId", id); response.setHeader("X-Request-Id", id); chain.doFilter(request, response);
            }
        };
        var registration = new FilterRegistrationBean<OncePerRequestFilter>(filter);
        registration.setOrder(Integer.MIN_VALUE);
        return registration;
    }
    private HttpSecurity base(HttpSecurity http, ObjectMapper json) throws Exception {
        return http.csrf(csrf -> csrf.disable()).sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/opendata/v1/tasks").hasAuthority("SCOPE_opendata.tasks.dispatch")
                .requestMatchers(HttpMethod.POST, "/api/opendata/v1/tasks/*/actions").hasAnyAuthority("SCOPE_opendata.tasks.write", "SCOPE_opendata.tasks.dispatch")
                .requestMatchers(HttpMethod.GET, "/api/opendata/v1/session", "/api/opendata/v1/tasks", "/api/opendata/v1/tasks/**").hasAuthority("SCOPE_opendata.tasks.read")
                .anyRequest().denyAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> ApiErrors.write(json, request, response, 401, "UNAUTHENTICATED", "Authentication required"))
                .accessDeniedHandler((request, response, error) -> ApiErrors.write(json, request, response, 403, "FORBIDDEN", "Permission denied")));
    }
    @Bean @Profile("!local")
    public JwtDecoder jwtDecoder(@Value("${opendata.security.issuer}") String issuer,
        @Value("${opendata.security.jwk-set-uri}") String jwkUri, @Value("${opendata.security.audience}") String audience) {
        if (issuer.isBlank() || jwkUri.isBlank()) throw new IllegalStateException("PLATFORM_JWT_ISSUER and PLATFORM_JWK_SET_URI are required outside the local profile");
        var decoder = NimbusJwtDecoder.withJwkSetUri(jwkUri).build();
        OAuth2TokenValidator<Jwt> checkAudience = jwt -> jwt.getAudience().contains(audience) ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Required audience missing", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer), checkAudience));
        return decoder;
    }
    @Bean @Profile("!local")
    public SecurityFilterChain platformSecurity(HttpSecurity http, ObjectMapper json) throws Exception {
        return base(http, json).oauth2ResourceServer(resource -> resource.jwt(jwt -> {})
            .authenticationEntryPoint((request, response, error) -> ApiErrors.write(json, request, response, 401, "UNAUTHENTICATED", "Valid platform token required"))).build();
    }
    @Bean @Profile("local")
    public SecurityFilterChain localSecurity(HttpSecurity http, ObjectMapper json, @Value("${opendata.security.dev-token}") String token) throws Exception {
        if (token.isBlank() || token.length() < 24) throw new IllegalStateException("Set OPENDATA_DEV_TOKEN to a random value of at least 24 characters for local development");
        var filter = new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
                String supplied = request.getHeader("Authorization");
                boolean valid = supplied != null && MessageDigest.isEqual(("Bearer " + token).getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
                if (valid) {
                    var principal = new RequestIdentity.LocalUser(request.getHeader("X-Dev-Tenant"), request.getHeader("X-Dev-User"));
                    var scopes = List.of("opendata.tasks.read", "opendata.tasks.write", "opendata.tasks.dispatch").stream().map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope)).toList();
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, scopes));
                }
                chain.doFilter(request, response);
            }
        };
        return base(http, json).addFilterBefore(filter, AnonymousAuthenticationFilter.class).build();
    }
}
