import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDefinition,
  evaluate,
  start,
  act,
  builtins,
  terminate,
} from "./engine.mjs";
const assignment = { mode: "members", ids: ["a", "b"] };
const exec = (id) => ({ id, kind: "execute", assignment });
const review = (id, approval = "any") => ({
  id,
  kind: "review",
  assignment,
  approval,
});
const def = (nodes) => ({
  id: "d",
  name: "Test",
  type: "normal",
  description: "",
  enabled: true,
  revision: 1,
  nodes,
});
const tree = (value = "approved") => ({
  logic: "and",
  children: [{ field: "approvalResult", operator: "eq", value }],
});
const branch = (id, nodes, fallback = false, priority = 1) => ({
  id,
  nodes,
  fallback,
  priority,
  condition: tree(),
});
test("review requires execution on every path including fallback", () => {
  assert.throws(
    () => validateDefinition(def([review("r")])),
    /reviewBeforeExecute/,
  );
  assert.throws(
    () =>
      validateDefinition(
        def([
          {
            id: "g",
            kind: "condition",
            branches: [
              branch("a", [exec("e")]),
              branch("b", [exec("e2")], false, 2),
              branch("c", [], true),
            ],
          },
          review("r"),
        ]),
      ),
    /reviewBeforeExecute/,
  );
});
test("conditions enforce field enum, types, missing context and nesting", () => {
  assert.equal(evaluate(tree(), {}), false);
  assert.equal(evaluate(tree(), { approvalResult: "approved" }), true);
  assert.throws(
    () =>
      validateDefinition(
        def([
          {
            id: "g",
            kind: "condition",
            branches: [
              { ...branch("a", []), condition: { logic: "and", children: [] } },
              branch("b", [], false, 2),
              branch("c", [], true),
            ],
          },
        ]),
      ),
    /conditions/,
  );
});
test("any approval, snapshot immutability and task authorization", () => {
  const d = def([exec("e"), review("r")]);
  const i = start(d, {}, "a");
  d.nodes = [];
  assert.equal(i.definition.nodes.length, 2);
  assert.throws(() => act(i, i.tasks[0].id, "submit", "c"), /forbidden/);
  act(i, i.tasks[0].id, "submit", "a");
  act(i, i.tasks[1].id, "approve", "b");
  assert.equal(i.status, "completed");
  assert.throws(() => act(i, i.tasks[1].id, "approve", "b"), /instanceClosed/);
});
test("all approval waits and prevents duplicate votes", () => {
  const i = start(def([exec("e"), review("r", "all")]), {}, "a");
  act(i, i.tasks[0].id, "submit", "a");
  act(i, i.tasks[1].id, "approve", "a");
  assert.equal(i.status, "running");
  assert.throws(() => act(i, i.tasks[1].id, "approve", "a"), /action/);
  act(i, i.tasks[1].id, "approve", "b");
  assert.equal(i.status, "completed");
});
test("parallel waits for every selected branch before continuation", () => {
  const i = start(
    def([
      {
        id: "p",
        kind: "parallel",
        branches: [
          branch("a", [exec("a")]),
          branch("b", [exec("b")], false, 2),
          branch("c", [exec("c")], true),
        ],
      },
      exec("after"),
    ]),
    { approvalResult: "approved" },
    "a",
  );
  assert.equal(i.tasks.length, 2);
  act(i, i.tasks[0].id, "submit", "a");
  assert.equal(i.tasks.length, 2);
  act(i, i.tasks[1].id, "submit", "a");
  assert.equal(i.tasks[2].node.id, "after");
  act(i, i.tasks[2].id, "submit", "a");
  assert.equal(i.status, "completed");
});
test("exclusive picks first priority; fallback is selected only without matches", () => {
  const d = def([
    {
      id: "p",
      kind: "condition",
      branches: [
        branch("a", [exec("a")]),
        branch("b", [exec("b")], false, 2),
        branch("c", [exec("c")], true),
      ],
    },
  ]);
  assert.equal(
    start(d, { approvalResult: "approved" }, "a").tasks[0].node.id,
    "a",
  );
  assert.equal(start(d, {}, "a").tasks[0].node.id, "c");
});
test("return increments count and reopens previous execution", () => {
  const i = start(def([exec("a"), exec("b")]), {}, "a");
  act(i, i.tasks[0].id, "submit", "a");
  act(i, i.tasks[1].id, "return", "a");
  assert.equal(i.context.returnCount, 1);
  assert.equal(i.tasks.at(-1).node.id, "a");
});
test("built-in extension auto-executes and emits completion hook", () => {
  const i = start(
    builtins()[0],
    {
      projectRoles: { projectOwner: ["a"] },
      activityId: "act",
      extensionDays: 2,
    },
    "a",
  );
  assert.equal(i.tasks.length, 1);
  act(i, i.tasks[0].id, "approve", "a");
  assert.equal(i.effects[0].type, "extendActivity");
});
test("external nodes wait without pretending delivery", () => {
  const i = start(
    def([
      {
        id: "mail",
        kind: "email",
        assignment,
        message: { title: "Hi", content: "Text" },
      },
    ]),
    {},
    "a",
  );
  assert.equal(i.status, "running");
  assert.equal(i.tasks[0].status, "external");
});
test("withdraw cancels pending tasks and releases extension lock", () => {
  const i = start(
    builtins()[0],
    {
      projectRoles: { projectOwner: ["a"] },
      activityId: "act",
      extensionDays: 2,
    },
    "a",
  );
  terminate(i, "withdrawn", "a");
  assert.equal(i.tasks[0].status, "cancelled");
  assert.equal(i.effects[0].type, "extensionDeclined");
});
