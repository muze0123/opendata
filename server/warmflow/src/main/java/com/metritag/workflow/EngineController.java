package com.metritag.workflow;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.dromara.warm.flow.core.dto.DefJson;
import org.dromara.warm.flow.core.dto.FlowParams;
import org.dromara.warm.flow.core.service.DefService;
import org.dromara.warm.flow.core.service.InsService;
import org.dromara.warm.flow.core.service.TaskService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/** Internal engine adapter. Business validation and identity resolution belong to the API gateway. */
@RestController
@RequestMapping("/internal/engine")
public class EngineController {
    private final DefService definitions;
    private final InsService instances;
    private final TaskService tasks;
    private final org.dromara.warm.flow.core.service.UserService users;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public EngineController(DefService definitions, InsService instances, TaskService tasks, org.springframework.jdbc.core.JdbcTemplate jdbc, org.dromara.warm.flow.core.service.UserService users) {
        this.definitions = definitions;
        this.instances = instances;
        this.tasks = tasks;
        this.users = users;
        this.jdbc = jdbc;
    }

    public record Command(String key, String operation, com.fasterxml.jackson.databind.JsonNode body) {}

    @PostMapping("/commands")
    @Transactional
    public synchronized Object command(@RequestBody Command command) throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        String request = command.operation() + command.body().toString();
        var cached = jdbc.query("SELECT request_body,response_body FROM opendata_engine_command WHERE command_key=?", (row, index) -> Map.of("request_body", row.getString(1), "response_body", row.getString(2)), command.key());
        if (!cached.isEmpty()) {
            if (!request.equals(cached.getFirst().get("request_body").toString()))
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT);
            return mapper.readTree(cached.getFirst().get("response_body").toString());
        }
        var body = command.body();
        Object result;
        if (command.operation().equals("start")) {
            var instance = instances.start(body.path("businessId").asText(), new FlowParams()
                .flowCode(body.path("flowCode").asText()).handler(body.path("actor").asText())
                .variable(mapper.convertValue(body.path("variables"), Map.class)));
            result = Map.of("id", instance.getId().toString());
        } else if (command.operation().equals("complete")) {
            tasks.skip(Long.valueOf(body.path("taskId").asText()), mapper.treeToValue(body.path("parameters"), FlowParams.class));
            result = Map.of("ok", true);
        } else if (command.operation().equals("terminate")) {
            tasks.terminationByInsId(Long.valueOf(body.path("instanceId").asText()), new FlowParams().handler(body.path("actor").asText()).ignore(true));
            result = Map.of("ok", true);
        } else throw new IllegalArgumentException("Unsupported engine operation");
        String response = mapper.writeValueAsString(result);
        jdbc.update("INSERT INTO opendata_engine_command VALUES (?,?,?)", command.key(), request, response);
        return result;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("engine", "Warm-Flow", "version", "1.8.9");
    }

    @PostMapping("/deploy")
    @Transactional
    public Object deploy(@RequestBody DefJson definition) {
        var existing = jdbc.queryForList("SELECT id FROM flow_definition WHERE flow_code=? AND version=? AND del_flag='0'", definition.getFlowCode(), definition.getVersion());
        if (!existing.isEmpty()) {
            return Map.of("definitionId", String.valueOf(existing.getFirst().get("id")), "engine", "Warm-Flow");
        }
        var imported = definitions.importDef(definition);
        definitions.publish(imported.getId());
        return Map.of("definitionId", String.valueOf(imported.getId()), "engine", "Warm-Flow");
    }

    @PostMapping("/definitions")
    @Transactional
    public Object importDefinition(@RequestBody DefJson definition) {
        return definitions.importDef(definition);
    }

    @PostMapping("/definitions/{id}/publish")
    @Transactional
    public Object publish(@PathVariable Long id) {
        return Map.of("published", definitions.publish(id));
    }

    public record StartRequest(@NotBlank String businessId, @NotBlank String flowCode,
                               @NotBlank String actor, Map<String, Object> variables) {}

    @PostMapping("/instances")
    @Transactional
    public Object start(@Valid @RequestBody StartRequest request) {
        return instances.start(request.businessId(), new FlowParams()
            .flowCode(request.flowCode()).handler(request.actor()).variable(request.variables()));
    }

    @GetMapping("/instances/{id}/tasks")
    public Object tasks(@PathVariable Long id) {
        return tasks.getByInsId(id).stream().map(task -> Map.of(
            "id", task.getId().toString(), "nodeCode", task.getNodeCode(),
            "permissions", users.getPermission(task.getId(), "1"))).toList();
    }

    @PostMapping("/tasks/{id}/complete")
    @Transactional
    public Object complete(@PathVariable Long id, @RequestBody FlowParams parameters) {
        return tasks.skip(id, parameters);
    }
}
