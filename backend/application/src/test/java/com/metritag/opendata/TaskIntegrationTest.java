package com.metritag.opendata;

import com.fasterxml.jackson.databind.*;
import com.metritag.opendata.platform.OutboxPublisher;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class TaskIntegrationTest {
    static final EmbeddedPostgres POSTGRES;
    static final HttpServer PLATFORM;
    static final String TOKEN = UUID.randomUUID().toString();
    static final AtomicInteger RESPONSE = new AtomicInteger(202);
    static final AtomicBoolean WRONG_ACK = new AtomicBoolean();
    static final List<String> EVENTS = new CopyOnWriteArrayList<>();
    static {
        try {
            POSTGRES = EmbeddedPostgres.builder().setPort(0).start();
            PLATFORM = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            PLATFORM.createContext("/events", exchange -> {
                exchange.getRequestBody().readAllBytes();
                String id = exchange.getRequestHeaders().getFirst("Idempotency-Key");
                EVENTS.add(id);
                boolean authorized = "Bearer integration-token".equals(exchange.getRequestHeaders().getFirst("Authorization"));
                String acknowledged = WRONG_ACK.get() ? UUID.randomUUID().toString() : id;
                byte[] body = ("{\"eventId\":\"" + acknowledged + "\",\"accepted\":true}").getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(authorized ? RESPONSE.get() : 401, body.length);
                exchange.getResponseBody().write(body); exchange.close();
            });
            PLATFORM.start();
        } catch (Exception error) { throw new ExceptionInInitializerError(error); }
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "");
        registry.add("opendata.security.dev-token", () -> TOKEN);
        registry.add("opendata.platform.event-endpoint", () -> "http://127.0.0.1:" + PLATFORM.getAddress().getPort() + "/events");
        registry.add("opendata.platform.service-token", () -> "integration-token");
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired OutboxPublisher publisher;
    @LocalServerPort int port;

    @BeforeEach void clean() {
        jdbc.execute("TRUNCATE task_outbox,task_action_log,command_receipt,business_task,platform_node_reference,platform_root_reference CASCADE");
        RESPONSE.set(202); WRONG_ACK.set(false); EVENTS.clear();
    }
    @AfterAll static void stop() throws Exception { PLATFORM.stop(0); POSTGRES.close(); }

    Map<String,Object> dispatchBody() {
        return new LinkedHashMap<>(Map.of("platformCode","tianshu", "rootTaskId","root-1", "nodeTaskId","node-1",
            "workflowInstanceId","flow-1", "businessKey","assessment-1", "businessType","assessment",
            "title","Business task", "description","", "creatorId","creator", "assigneeId","alice"));
    }
    RequestBuilder dispatch(String tenant, String key, Map<String,Object> body) throws Exception {
        return post("/api/opendata/v1/tasks").header("Authorization", "Bearer " + TOKEN)
            .header("X-Dev-Tenant",tenant).header("X-Dev-User","platform-service").header("Idempotency-Key",key)
            .contentType("application/json").content(json.writeValueAsString(body));
    }
    JsonNode create() throws Exception {
        return json.readTree(mvc.perform(dispatch("tenant-a", "receive-1", dispatchBody())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    RequestBuilder action(String id, String key, String actor, String action, long version, String reason) throws Exception {
        return post("/api/opendata/v1/tasks/" + id + "/actions")
            .with(jwt().jwt(token -> token.subject(actor).claim("tenant_id","tenant-a"))
                .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.write")))
            .header("Idempotency-Key",key).contentType("application/json")
            .content(json.writeValueAsString(Map.of("action",action,"expectedVersion",version,"reason",reason)));
    }
    @Test void realPostgresFlywayAndHttpServerAreRunning() throws Exception {
        assertThat(jdbc.queryForObject("SELECT version()", String.class)).contains("PostgreSQL 17");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success", Integer.class)).isEqualTo(3);
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/actuator/health")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("UP");
    }
    @Test void lifecycleReturnAndCompletionAreAtomicAndIdempotent() throws Exception {
        var first = create(); String id = first.path("id").asText();
        var replay = mvc.perform(dispatch("tenant-a", "receive-1", dispatchBody())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(replay)).isEqualTo(first);
        mvc.perform(action(id,"start-1","alice","start",0,"")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("in-progress"));
        mvc.perform(action(id,"return-1","alice","return",1,"Supplement evidence")).andExpect(status().isOk()).andExpect(jsonPath("$.returnCount").value(1));
        mvc.perform(action(id,"start-2","alice","start",2,"")).andExpect(status().isOk());
        mvc.perform(action(id,"complete-1","alice","complete",3,"")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("completed")).andExpect(jsonPath("$.version").value(4));
        mvc.perform(action(id,"complete-1","alice","complete",3,"")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(4));
        mvc.perform(action(id,"complete-2","alice","complete",4,"")).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_action_log", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_outbox", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM command_receipt WHERE response_body IS NULL", Integer.class)).isZero();
    }
    @Test void tenantAndActorChecksAndScopesCannotBeBypassed() throws Exception {
        String id = create().path("id").asText();
        mvc.perform(get("/api/opendata/v1/tasks")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/opendata/v1/tasks/"+id).with(jwt().jwt(token -> token.subject("alice").claim("tenant_id","tenant-b"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.read")))).andExpect(status().isNotFound());
        mvc.perform(get("/api/opendata/v1/tasks").with(jwt().jwt(token -> token.claim("tenant_id","tenant-b"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.read")))).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(action(id,"wrong-actor","bob","start",0,"")).andExpect(status().isForbidden());
        mvc.perform(action(id,"wrong-recall","alice","recall",0,"reason")).andExpect(status().isForbidden());
        mvc.perform(post("/api/opendata/v1/tasks").with(jwt().jwt(token -> token.claim("tenant_id","tenant-a"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.write"))).header("Idempotency-Key","no-dispatch")
            .contentType("application/json").content(json.writeValueAsString(dispatchBody()))).andExpect(status().isForbidden());
        mvc.perform(get("/api/opendata/v1/tasks").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.read"))))
            .andExpect(status().isUnauthorized());
    }
    @Test void validationHierarchyAndIdempotencyConflictsRollback() throws Exception {
        var body = dispatchBody(); body.put("title"," ");
        mvc.perform(dispatch("tenant-a","invalid",body)).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM business_task", Integer.class)).isZero();
        var task = create();
        body = dispatchBody(); body.put("title","Other");
        mvc.perform(dispatch("tenant-a","receive-1",body)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        body = dispatchBody(); body.put("rootTaskId","different-root"); body.put("businessKey","another");
        mvc.perform(dispatch("tenant-a","different-parent",body)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PARENT_BINDING_CONFLICT"));
        mvc.perform(dispatch("tenant-a","duplicate-business",dispatchBody())).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform_root_reference", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM command_receipt", Integer.class)).isEqualTo(1);
        mvc.perform(action(task.path("id").asText(),"missing-reason","creator","cancel",0,"")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/opendata/v1/tasks?size=101").with(jwt().jwt(token -> token.claim("tenant_id","tenant-a"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.read")))).andExpect(status().isBadRequest());
    }
    @Test void concurrentCommandsHaveExactlyOneWinner() throws Exception {
        String id = create().path("id").asText();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
            List<Future<Integer>> responses = new ArrayList<>();
            for (int index=0;index<2;index++) {
                String key="concurrent-"+index;
                responses.add(executor.submit(() -> { ready.countDown(); start.await(); return mvc.perform(action(id,key,"alice","start",0,"")).andReturn().getResponse().getStatus(); }));
            }
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue(); start.countDown();
            assertThat(List.of(responses.get(0).get(10,TimeUnit.SECONDS),responses.get(1).get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("SELECT version FROM business_task", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_outbox", Integer.class)).isEqualTo(2);
    }
    @Test void outboxRetriesSameEventAndBlocksLaterVersions() throws Exception {
        String id = create().path("id").asText();
        mvc.perform(action(id,"start","alice","start",0,"")).andExpect(status().isOk());
        RESPONSE.set(503);
        assertThat(publisher.publishNext()).isTrue();
        assertThat(publisher.publishNext()).isFalse();
        assertThat(jdbc.queryForObject("SELECT last_error FROM task_outbox WHERE attempts=1", String.class)).isEqualTo("PLATFORM_HTTP_503");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_outbox WHERE delivered_at IS NOT NULL", Integer.class)).isZero();
        jdbc.update("UPDATE task_outbox SET available_at=now() WHERE delivered_at IS NULL");
        RESPONSE.set(202); WRONG_ACK.set(true);
        publisher.publishNext();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_outbox WHERE delivered_at IS NOT NULL", Integer.class)).isZero();
        jdbc.update("UPDATE task_outbox SET available_at=now() WHERE delivered_at IS NULL");
        WRONG_ACK.set(false);
        publisher.publishNext(); publisher.publishNext();
        assertThat(EVENTS).hasSize(4);
        assertThat(EVENTS.get(0)).isEqualTo(EVENTS.get(1)).isEqualTo(EVENTS.get(2));
        assertThat(EVENTS.get(3)).isNotEqualTo(EVENTS.get(0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM task_outbox WHERE delivered_at IS NOT NULL", Integer.class)).isEqualTo(2);
    }

    @Test void sessionAndLiteralSearchRemainTenantScoped() throws Exception {
        create();
        var identity = jwt().jwt(token -> token.subject("alice").claim("tenant_id", "tenant-a"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.read"));
        mvc.perform(get("/api/opendata/v1/session").with(identity)).andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("alice")).andExpect(jsonPath("$.tenantId").value("tenant-a"));
        mvc.perform(get("/api/opendata/v1/tasks").param("q", "BUSINESS").with(identity))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/opendata/v1/tasks").param("q", "%").with(identity))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/opendata/v1/tasks").param("status", "completed").with(identity))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/opendata/v1/tasks").param("q", "x".repeat(201)).with(identity)).andExpect(status().isBadRequest());
    }

    @Test void missingVersionAndUnknownFieldsAreRejected() throws Exception {
        String id=create().path("id").asText();
        mvc.perform(post("/api/opendata/v1/tasks/"+id+"/actions").with(jwt().jwt(token -> token.subject("alice").claim("tenant_id","tenant-a"))
            .authorities(new SimpleGrantedAuthority("SCOPE_opendata.tasks.write"))).header("Idempotency-Key","missing-version")
            .contentType("application/json").content("{\"action\":\"start\",\"reason\":\"\"}"))
            .andExpect(status().isBadRequest());
        var body=dispatchBody();body.put("tenantId","tenant-b");
        mvc.perform(dispatch("tenant-a","tenant-override",body)).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT version FROM business_task",Long.class)).isZero();
    }
    @Test void cancellationAndRecallAreTerminal() throws Exception {
        String id = create().path("id").asText();
        mvc.perform(action(id,"cancel","creator","cancel",0,"No longer needed")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        mvc.perform(action(id,"start-after-cancel","alice","start",1,"")).andExpect(status().isConflict());
        var body=dispatchBody(); body.put("businessKey","second");
        String second=json.readTree(mvc.perform(dispatch("tenant-a","receive-2",body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asText();
        mvc.perform(post("/api/opendata/v1/tasks/"+second+"/actions").header("Authorization","Bearer "+TOKEN)
            .header("X-Dev-Tenant","tenant-a").header("X-Dev-User","platform-service").header("Idempotency-Key","recall")
            .contentType("application/json").content("{\"action\":\"recall\",\"expectedVersion\":0,\"reason\":\"Withdrawn upstream\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("recalled"));
    }

}
