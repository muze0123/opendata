package com.metritag.opendata.tasks.api;

import com.metritag.opendata.security.RequestIdentity;
import com.metritag.opendata.tasks.application.TaskService;
import com.metritag.opendata.tasks.application.TaskCommands;
import com.metritag.opendata.tasks.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/opendata/v1/tasks")
public class TaskController {
    private final TaskService tasks;
    public TaskController(TaskService tasks) { this.tasks = tasks; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public TaskView dispatch(Authentication auth, @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody TaskCommands.Dispatch request) {
        return tasks.dispatch(RequestIdentity.actor(auth), key, request);
    }
    @GetMapping public TaskPage list(Authentication auth, @RequestParam(required=false) String status,
        @RequestParam(defaultValue="") @Size(max=200) String q,
        @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page,
        @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        TaskStatus filter = null;
        if (status != null) {
            try { filter = TaskStatus.from(status); }
            catch (IllegalArgumentException error) { throw new com.metritag.opendata.shared.DomainException(400, "INVALID_REQUEST", "Unknown status filter"); }
        }
        return tasks.list(RequestIdentity.actor(auth), filter, q.strip(), page, size);
    }
    @GetMapping("/{id}") public TaskView get(Authentication auth, @PathVariable UUID id) {
        return tasks.get(RequestIdentity.actor(auth), id);
    }
    @GetMapping("/{id}/actions") public List<ActionLog> actions(Authentication auth, @PathVariable UUID id) {
        return tasks.actions(RequestIdentity.actor(auth), id);
    }
    @PostMapping("/{id}/actions") public TaskView act(Authentication auth, @PathVariable UUID id,
        @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody TaskCommands.Action request) {
        return tasks.act(RequestIdentity.actor(auth), id, key, request);
    }
}
