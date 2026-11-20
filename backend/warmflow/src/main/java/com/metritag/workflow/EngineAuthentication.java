package com.metritag.workflow;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class EngineAuthentication extends OncePerRequestFilter {
    private final byte[] authorization;

    public EngineAuthentication(@Value("${warmflow.bridge-token}") String token) {
        if (token.length() < 32) throw new IllegalArgumentException("WARMFLOW_BRIDGE_TOKEN must contain at least 32 characters");
        authorization = ("Bearer " + token).getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("Authorization");
        if (supplied == null || !MessageDigest.isEqual(authorization, supplied.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":\"unauthorized\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
