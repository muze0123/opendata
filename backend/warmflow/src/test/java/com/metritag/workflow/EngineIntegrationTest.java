package com.metritag.workflow;

import org.dromara.warm.flow.core.dto.*;
import org.dromara.warm.flow.core.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:engine_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "warmflow.bridge-token=integration-test-token-at-least-32-characters"
})
class EngineIntegrationTest {
    @Autowired DefService definitions;
    @Autowired InsService instances;
    @Autowired TaskService tasks;
    @Autowired EngineController controller;

    @Test
    void publishStartAndComplete() {
        var start = new NodeJson().setNodeCode("start").setNodeName("Submit").setNodeType(0);
        var execute = new NodeJson().setNodeCode("execute").setNodeName("Execute").setNodeType(1)
            .setPermissionFlag("u-admin").setNodeRatio("0");
        var end = new NodeJson().setNodeCode("end").setNodeName("End").setNodeType(2);
        start.setSkipList(List.of(new SkipJson().setNowNodeCode("start").setNextNodeCode("execute").setSkipType("PASS")));
        execute.setSkipList(List.of(new SkipJson().setNowNodeCode("execute").setNextNodeCode("end").setSkipType("PASS")));
        var definition = definitions.importDef(new DefJson().setFlowCode("integration_test")
            .setFlowName("Integration test").setVersion("1").setModelValue("CLASSICS")
            .setNodeList(List.of(start, execute, end)));
        assertTrue(definitions.publish(definition.getId()));
        var instance = instances.start("business-1", new FlowParams().flowCode("integration_test")
            .handler("u-admin").variable(Map.of()));
        var pending = tasks.getByInsId(instance.getId());
        assertEquals(1, pending.size());
        var completed = tasks.skip(pending.getFirst().getId(), new FlowParams().handler("u-admin")
            .permissionFlag(List.of("u-admin")).skipType("PASS"));
        assertTrue(tasks.getByInsId(instance.getId()).isEmpty());
        assertEquals("8", completed.getFlowStatus());
    }

    @Test
    void nativeExclusiveAndConditionalParallelJoin() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        for (String kind : List.of("condition", "parallel")) {
            try (var input = getClass().getResourceAsStream("/" + kind + ".json")) {
                var definition = definitions.importDef(mapper.readValue(input, DefJson.class));
                definitions.publish(definition.getId());
                var instance = instances.start("business-" + kind, new FlowParams().flowCode("test_" + kind)
                    .handler("u-admin").variable(Map.of("returnCount", 0)));
                var before = tasks.getByInsId(instance.getId()).getFirst();
                tasks.skip(before.getId(), new FlowParams().handler("u-admin")
                    .permissionFlag(List.of("u-admin")).skipType("PASS"));
                var branches = tasks.getByInsId(instance.getId());
                assertEquals(kind.equals("parallel") ? 2 : 1, branches.size());
                assertTrue(branches.stream().noneMatch(t -> t.getNodeCode().equals("fallbacktask")));
                for (var task : branches) {
                    tasks.skip(task.getId(), new FlowParams().handler("u-admin")
                        .permissionFlag(List.of("u-admin")).skipType("PASS"));
                }
                var after = tasks.getByInsId(instance.getId());
                assertEquals(1, after.size());
                assertEquals("after", after.getFirst().getNodeCode());
            }
        }
    }

    @Test
    void nativeAllAndAnyApproval() {
        for (String ratio : List.of("0", "100")) {
            var start = new NodeJson().setNodeCode("start").setNodeName("Submit").setNodeType(0);
            var review = new NodeJson().setNodeCode("review").setNodeName("Review").setNodeType(1)
                .setPermissionFlag("alice@@bob").setNodeRatio(ratio);
            var end = new NodeJson().setNodeCode("end").setNodeName("End").setNodeType(2);
            start.setSkipList(List.of(new SkipJson().setNowNodeCode("start").setNextNodeCode("review").setSkipType("PASS")));
            review.setSkipList(List.of(new SkipJson().setNowNodeCode("review").setNextNodeCode("end").setSkipType("PASS")));
            var definition = definitions.importDef(new DefJson().setFlowCode("sign_" + ratio)
                .setFlowName("Sign test").setVersion("1").setModelValue("CLASSICS").setNodeList(List.of(start, review, end)));
            definitions.publish(definition.getId());
            var instance = instances.start("sign-business-" + ratio, new FlowParams().flowCode("sign_" + ratio).handler("alice"));
            var task = tasks.getByInsId(instance.getId()).getFirst();
            tasks.skip(task.getId(), new FlowParams().handler("alice").permissionFlag(List.of("alice")).skipType("PASS"));
            assertEquals(ratio.equals("100") ? 1 : 0, tasks.getByInsId(instance.getId()).size());
            if (ratio.equals("100")) {
                tasks.skip(task.getId(), new FlowParams().handler("bob").permissionFlag(List.of("bob")).skipType("PASS"));
                assertTrue(tasks.getByInsId(instance.getId()).isEmpty());
            }
        }
    }

    @Test
    void commandReplayUsesTheSamePersistedInstance() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try (var input = getClass().getResourceAsStream("/condition.json")) {
            var definition = mapper.readValue(input, DefJson.class).setFlowCode("replay_flow");
            controller.deploy(definition);
            var body = mapper.readTree("{\"businessId\":\"replay-business\",\"flowCode\":\"replay_flow\",\"actor\":\"u-admin\",\"variables\":{\"returnCount\":0}}");
            var command = new EngineController.Command("replay-command", "start", body);
            String first = mapper.writeValueAsString(controller.command(command));
            String second = mapper.writeValueAsString(controller.command(command));
            assertEquals(first, second);
        }
    }
}
