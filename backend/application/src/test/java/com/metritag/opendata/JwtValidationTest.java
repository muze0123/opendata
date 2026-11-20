package com.metritag.opendata;

import com.metritag.opendata.security.SecurityConfiguration;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import static org.assertj.core.api.Assertions.*;

class JwtValidationTest {
    @Test void signatureIssuerAudienceAndExpirationAreValidated() throws Exception {
        var key = new RSAKeyGenerator(2048).keyID("test-key").generate();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks", exchange -> {
            byte[] response = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type","application/json");
            exchange.sendResponseHeaders(200,response.length);
            exchange.getResponseBody().write(response); exchange.close();
        });
        server.start();
        try {
            String issuer="https://platform.example.test";
            var decoder = new SecurityConfiguration().jwtDecoder(issuer,"http://127.0.0.1:"+server.getAddress().getPort()+"/jwks","opendata");
            assertThat(decoder.decode(token(key,issuer,"opendata",Instant.now().plusSeconds(300))).getSubject()).isEqualTo("alice");
            assertThatThrownBy(() -> decoder.decode(token(key,"https://other.example.test","opendata",Instant.now().plusSeconds(300)))).isInstanceOf(JwtException.class);
            assertThatThrownBy(() -> decoder.decode(token(key,issuer,"another-app",Instant.now().plusSeconds(300)))).isInstanceOf(JwtException.class);
            assertThatThrownBy(() -> decoder.decode(token(key,issuer,"opendata",Instant.now().minusSeconds(300)))).isInstanceOf(JwtException.class);
            var wrongKey = new RSAKeyGenerator(2048).keyID("test-key").generate();
            assertThatThrownBy(() -> decoder.decode(token(wrongKey,issuer,"opendata",Instant.now().plusSeconds(300)))).isInstanceOf(JwtException.class);
        } finally { server.stop(0); }
    }
    private String token(RSAKey key, String issuer, String audience, Instant expires) throws JOSEException {
        var claims=new JWTClaimsSet.Builder().subject("alice").issuer(issuer).audience(audience)
            .expirationTime(Date.from(expires)).claim("tenant_id","tenant-a").claim("scope","opendata.tasks.read").build();
        var signed=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),claims);
        signed.sign(new RSASSASigner(key));
        return signed.serialize();
    }
}
