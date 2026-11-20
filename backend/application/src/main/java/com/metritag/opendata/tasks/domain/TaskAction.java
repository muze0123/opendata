package com.metritag.opendata.tasks.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum TaskAction {
    START("start"), COMPLETE("complete"), RETURN("return"), CANCEL("cancel"), RECALL("recall");
    private final String code;
    TaskAction(String code) { this.code = code; }
    @JsonValue public String code() { return code; }
    @JsonCreator public static TaskAction from(String code) {
        return Arrays.stream(values()).filter(value -> value.code.equals(code)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown task action"));
    }
}
