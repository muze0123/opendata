package com.metritag.opendata.tasks.application;

import com.metritag.opendata.tasks.domain.TaskAction;
import jakarta.validation.constraints.*;

public final class TaskCommands {
    private TaskCommands() {}
    public record Dispatch(
        @NotBlank @Size(max=64) String platformCode,
        @NotBlank @Size(max=128) String rootTaskId,
        @NotBlank @Size(max=128) String nodeTaskId,
        @NotBlank @Size(max=128) String workflowInstanceId,
        @NotBlank @Size(max=128) String businessKey,
        @NotBlank @Size(max=64) String businessType,
        @NotBlank @Size(max=200) String title,
        @NotNull @Size(max=4000) String description,
        @NotBlank @Size(max=128) String creatorId,
        @NotBlank @Size(max=128) String assigneeId) {}

    public record Action(@NotNull TaskAction action, @NotNull @Min(0) Long expectedVersion,
                         @NotNull @Size(max=2000) String reason) {}
}
