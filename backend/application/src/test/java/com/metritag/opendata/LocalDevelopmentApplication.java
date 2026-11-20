package com.metritag.opendata;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.stream.Stream;

/** Explicit local-only launcher, using the test-classpath PostgreSQL binary. */
public final class LocalDevelopmentApplication {
    private LocalDevelopmentApplication() {}
    public static void main(String[] args) throws Exception {
        String token = System.getenv("OPENDATA_DEV_TOKEN");
        if (token == null || token.length() < 24) throw new IllegalStateException("Set OPENDATA_DEV_TOKEN before running backend:dev");
        String configured = System.getenv("OPENDATA_LOCAL_DATA_DIR");
        Path data = configured == null ? Path.of(".local-data", "postgres") : Path.of(configured);
        var postgres = EmbeddedPostgres.builder().setPort(0).setDataDirectory(data.toAbsolutePath())
            .setCleanDataDirectory(false).setServerConfig("listen_addresses", "127.0.0.1").start();
        try {
            var defaults = Stream.of("--spring.profiles.active=local", "--server.address=127.0.0.1",
                "--spring.datasource.url=" + postgres.getJdbcUrl("postgres", "postgres"),
                "--spring.datasource.username=postgres", "--spring.datasource.password=");
            var context = SpringApplication.run(OpenDataApplication.class, Stream.concat(Arrays.stream(args), defaults).toArray(String[]::new));
            context.addApplicationListener(event -> {
                if (event instanceof org.springframework.context.event.ContextClosedEvent) {
                    try { postgres.close(); } catch (java.io.IOException error) { throw new java.io.UncheckedIOException(error); }
                }
            });
        } catch (RuntimeException error) {
            postgres.close();
            throw error;
        }
    }
}
