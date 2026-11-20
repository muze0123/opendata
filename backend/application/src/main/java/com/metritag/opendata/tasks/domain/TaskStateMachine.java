package com.metritag.opendata.tasks.domain;

import com.metritag.opendata.shared.DomainException;

public final class TaskStateMachine {
    private TaskStateMachine() {}

    public static TaskStatus next(TaskView task, TaskAction action, Actor actor, String reason) {
        boolean assignee = task.assigneeId().equals(actor.userId());
        if (action == TaskAction.RECALL && !actor.platformService())
            throw new DomainException(403, "FORBIDDEN", "Only the platform may recall a task");
        if (action == TaskAction.CANCEL && !actor.platformService() && !task.creatorId().equals(actor.userId()))
            throw new DomainException(403, "FORBIDDEN", "Only the creator or platform may cancel a task");
        if (action != TaskAction.CANCEL && action != TaskAction.RECALL && !assignee)
            throw new DomainException(403, "FORBIDDEN", "Only the assignee may handle a task");
        if ((action == TaskAction.RETURN || action == TaskAction.CANCEL || action == TaskAction.RECALL) && reason.isBlank())
            throw new DomainException(400, "REASON_REQUIRED", "This action requires a reason");
        return switch (action) {
            case START -> require(task.status() == TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
            case COMPLETE -> require(task.status() == TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED);
            case RETURN -> require(task.status() == TaskStatus.IN_PROGRESS, TaskStatus.PENDING);
            case CANCEL -> require(active(task.status()), TaskStatus.CANCELLED);
            case RECALL -> require(active(task.status()), TaskStatus.RECALLED);
        };
    }
    private static boolean active(TaskStatus status) {
        return status == TaskStatus.PENDING || status == TaskStatus.IN_PROGRESS;
    }
    private static TaskStatus require(boolean condition, TaskStatus target) {
        if (!condition) throw new DomainException(409, "INVALID_TRANSITION", "Action is unavailable in the current state");
        return target;
    }
}
