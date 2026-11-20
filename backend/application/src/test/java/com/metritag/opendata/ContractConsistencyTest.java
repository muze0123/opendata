package com.metritag.opendata;

import com.fasterxml.jackson.databind.*;
import com.metritag.opendata.tasks.application.TaskCommands;
import com.metritag.opendata.tasks.application.TaskService.TaskEvent;
import com.metritag.opendata.tasks.domain.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ContractConsistencyTest {
    private final ObjectMapper json = new ObjectMapper();
    @Test void requestAndResponseRecordFieldsMatchPublishedSchemas() throws Exception {
        try (var stream = getClass().getResourceAsStream("/contracts/tasks/openapi.json")) {
            assertThat(stream).isNotNull();
            var schemas = json.readTree(stream).path("components").path("schemas");
            checkFields(schemas.path("DeliveryEvent"), com.metritag.opendata.platform.domain.DeliveryModels.Event.class);
            checkFields(schemas.path("DeliveryEventPage"), com.metritag.opendata.platform.domain.DeliveryModels.EventPage.class);
            checkFields(schemas.path("DeliverySummary"), com.metritag.opendata.platform.domain.DeliveryModels.Summary.class);
            checkFields(schemas.path("DeliveryRetry"), com.metritag.opendata.platform.domain.DeliveryModels.Retry.class);
            checkFields(schemas.path("DeliveryRetryReceipt"), com.metritag.opendata.platform.domain.DeliveryModels.RetryReceipt.class);
            checkFields(schemas.path("DeliveryRetryPage"), com.metritag.opendata.platform.domain.DeliveryModels.RetryPage.class);
            checkFields(schemas.path("Session"), com.metritag.opendata.security.SessionController.SessionView.class);
            checkFields(schemas.path("Dispatch"), TaskCommands.Dispatch.class);
            checkFields(schemas.path("Action"), TaskCommands.Action.class);
            checkFields(schemas.path("Task"), TaskView.class);
            checkFields(schemas.path("TaskPage"), TaskPage.class);
            checkFields(schemas.path("ActionLog"), ActionLog.class);
            assertThat(json.convertValue(schemas.path("Task").path("properties").path("status").path("enum"), String[].class))
                .containsExactly(Arrays.stream(TaskStatus.values()).map(TaskStatus::code).toArray(String[]::new));
            assertThat(json.convertValue(schemas.path("Action").path("properties").path("action").path("enum"), String[].class))
                .containsExactly(Arrays.stream(TaskAction.values()).map(TaskAction::code).toArray(String[]::new));
        }
        try (var stream = getClass().getResourceAsStream("/contracts/tasks/task-event.schema.json")) {
            checkFields(json.readTree(stream), TaskEvent.class);
        }
    }
    private void checkFields(JsonNode schema, Class<?> record) {
        var expected = Arrays.stream(record.getRecordComponents()).map(java.lang.reflect.RecordComponent::getName).toList();
        var actual = new ArrayList<String>(); schema.path("properties").fieldNames().forEachRemaining(actual::add);
        assertThat(actual).containsExactlyInAnyOrderElementsOf(expected);
        assertThat(json.convertValue(schema.path("required"), String[].class)).containsExactlyInAnyOrderElementsOf(expected);
    }
}
