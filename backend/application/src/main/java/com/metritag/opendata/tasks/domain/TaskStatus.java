package com.metritag.opendata.tasks.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum TaskStatus {
    PENDING("pending"), IN_PROGRESS("in-progress"), COMPLETED("completed"), RECALLED("recalled"), CANCELLED("cancelled");
    private final String code;
    TaskStatus(String code) { this.code = code; }
    @JsonValue public String code() { return code; }
    @JsonCreator public static TaskStatus from(String code) {
        return Arrays.stream(values()).filter(value -> value.code.equals(code)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown task status"));
    }
}
