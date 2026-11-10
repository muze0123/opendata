import { randomUUID } from "node:crypto";
export const NODE_CODES = [
  "execute",
  "review",
  "cc",
  "lims",
  "tara",
  "email",
  "sms",
  "condition",
  "parallel",
];
export const dictionaries = {
  projectStatus: ["planned", "active", "suspended", "completed", "cancelled"],
  projectStage: [
    "concept",
    "development",
    "prototype",
    "validation",
    "production",
    "maintenance",
  ],
  activityStatus: ["pending", "active", "overdue", "completed", "cancelled"],
  approvalResult: ["approved", "rejected"],
};
const operators = ["eq", "ne", "in", "notIn", "empty", "notEmpty"];
export class DomainError extends Error {
  constructor(code, status = 422) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const fail = (code) => {
  throw new DomainError(code);
};
export function validateTree(tree, type, depth = 1) {
  if (
    !tree ||
    depth > 3 ||
    !["and", "or"].includes(tree.logic) ||
    !Array.isArray(tree.children) ||
    !tree.children.length
  )
    fail("conditions");
  for (const c of tree.children) {
    if (c.logic) {
      validateTree(c, type, depth + 1);
      continue;
    }
    if (
      ![
        "approvalResult",
        "returnCount",
        ...(type === "project"
          ? ["projectStatus", "projectStage", "activityStatus"]
          : []),
      ].includes(c.field)
    )
      fail("conditions");
    if (c.field === "returnCount") {
      if (
        !["eq", "gt", "gte", "lt", "lte"].includes(c.operator) ||
        !Number.isInteger(c.value) ||
        c.value < 0
      )
        fail("conditions");
    } else {
      if (!operators.includes(c.operator)) fail("conditions");
      if (["empty", "notEmpty"].includes(c.operator)) continue;
      const values = ["in", "notIn"].includes(c.operator) ? c.value : [c.value];
      if (
        !Array.isArray(values) ||
        !values.length ||
        values.some((v) => !dictionaries[c.field].includes(v))
      )
        fail("conditions");
    }
  }
}
export function evaluate(tree, context) {
  const results = tree.children.map((c) => {
    if (c.logic) return evaluate(c, context);
    const actual = context[c.field],
      missing = actual === null || actual === undefined || actual === "";
    if (c.operator === "empty") return missing;
    if (missing) return false;
    switch (c.operator) {
      case "notEmpty":
        return true;
      case "eq":
        return actual === c.value;
      case "ne":
        return actual !== c.value;
      case "in":
        return c.value.includes(actual);
      case "notIn":
        return !c.value.includes(actual);
      case "gt":
        return actual > c.value;
      case "gte":
        return actual >= c.value;
      case "lt":
        return actual < c.value;
      case "lte":
        return actual <= c.value;
      default:
        return false;
    }
  });
  return tree.logic === "and" ? results.every(Boolean) : results.some(Boolean);
}
export function validateAttachments(attachments = []) {
  if (!Array.isArray(attachments)) fail("attachments");
  for (const file of attachments) {
    if (!file || typeof file.name !== "string" || !file.name || file.name.length > 255 ||
        !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
        !Number.isInteger(file.size) || file.size < 0 || file.size > 20 * 1024 * 1024 ||
        typeof file.data !== "string" || !file.data.startsWith(`data:${file.type};base64,`) ||
        Buffer.from(file.data.slice(file.data.indexOf(",") + 1), "base64").length !== file.size) fail("attachments");
  }
}
export function validateDefinition(def, complete = true) {
  if (
    !def.name?.trim() ||
    [...def.name.trim()].length > 20 ||
    !["normal", "project"].includes(def.type) ||
    typeof def.description !== "string" ||
    [...def.description].length > 500
  )
    fail("basic");
  if (!Array.isArray(def.nodes)) fail("structure");
  let count = 0;
  const ids = new Set();
  function walk(nodes, executed = false, depth = 0) {
    if (depth > 12 || !Array.isArray(nodes)) fail("structure");
    for (const n of nodes) {
      if (
        ++count > 200 ||
        !n.id ||
        ids.has(n.id) ||
        !NODE_CODES.includes(n.kind)
      )
        fail("structure");
      ids.add(n.id);
      if (n.kind === "condition" || n.kind === "parallel") {
        if (
          !Array.isArray(n.branches) ||
          n.branches.length < 3 ||
          n.branches.filter((b) => b.fallback).length !== 1 ||
          !n.branches.at(-1).fallback
        )
          fail("branches");
        const priorities = n.branches
          .filter((b) => !b.fallback)
          .map((b) => b.priority);
        if (
          n.kind === "condition" &&
          (new Set(priorities).size !== priorities.length ||
            priorities.some(
              (p) => !Number.isInteger(p) || p < 1 || p > priorities.length,
            ))
        )
          fail("priority");
        const outs = n.branches.map((b) => {
          if (complete && !b.fallback) validateTree(b.condition, def.type);
          return walk(b.nodes, executed, depth + 1);
        });
        executed = outs.every(Boolean);
        continue;
      }
      if (complete) {
        if (n.kind === "review" && !executed) fail("reviewBeforeExecute");
        const a = n.assignment;
        if (
          !a ||
          !["members", "roles", "projectRoles", "field", "auto"].includes(
            a.mode,
          )
        )
          fail("assignment");
        if (a.mode === "auto" && n.kind !== "execute") fail("assignment");
        if (
          a.mode === "field" &&
          (n.kind !== "execute" || a.field !== "responsible")
        )
          fail("assignment");
        if (
          !["auto", "field"].includes(a.mode) &&
          (!Array.isArray(a.ids) ||
            !a.ids.length ||
            a.ids.some((id) => typeof id !== "string" || !id))
        )
          fail("assignment");
        if (
          def.type === "project" &&
          !["projectRoles", "field", "auto"].includes(a.mode)
        )
          fail("assignment");
        if (def.type === "normal" && a.mode === "projectRoles")
          fail("assignment");
        if (n.kind === "review" && !["all", "any"].includes(n.approval))
          fail("assignment");
        if (
          ["email", "sms"].includes(n.kind) &&
          (!n.message?.title?.trim() ||
            n.message.title.length > 20 ||
            !n.message?.content?.trim() ||
            n.message.content.length > 500)
        )
          fail("message");
      }
      if (n.message) validateAttachments(n.message.attachments);
      if (n.kind === "execute") executed = true;
    }
    return executed;
  }
  walk(def.nodes);
}
function resolve(assignment, context) {
  if (assignment.mode === "auto") return [];
  if (assignment.mode === "field")
    return context.responsible ? [context.responsible] : [];
  if (assignment.mode === "members") return [...assignment.ids];
  const source =
    assignment.mode === "projectRoles" ? context.projectRoles : context.roles;
  return [...new Set(assignment.ids.flatMap((id) => source?.[id] ?? []))];
}
function event(instance, code, nodeId, actor) {
  instance.history.push({
    id: randomUUID(),
    code,
    nodeId,
    actor,
    at: new Date().toISOString(),
  });
}
export function start(def, context, actor) {
  validateDefinition(def);
  if (!def.enabled) fail("disabled");
  const instance = {
    id: randomUUID(),
    definitionId: def.id,
    definition: structuredClone(def),
    context: structuredClone(context),
    initiator: actor,
    status: "running",
    tokens: [
      {
        id: randomUUID(),
        queue: structuredClone(def.nodes),
        joins: [],
        executed: [],
      },
    ],
    joins: {},
    tasks: [],
    history: [],
    effects: [],
    createdAt: new Date().toISOString(),
  };
  event(instance, "started", undefined, actor);
  advance(instance);
  return instance;
}
function finish(instance) {
  if (
    instance.tokens.length ||
    instance.tasks.some((t) => t.status === "pending")
  )
    return;
  instance.status = "completed";
  event(instance, "completed");
  if (instance.definition.builtin === "extension")
    instance.effects.push({
      type: "extendActivity",
      activityId: instance.context.activityId,
      days: instance.context.extensionDays,
    });
  if (instance.definition.builtin === "risk")
    instance.effects.push({
      type: "resolveRisk",
      riskId: instance.context.riskId,
    });
}
export function advance(instance) {
  let limit = 0;
  while (instance.tokens.some((t) => !t.waiting)) {
    if (++limit > 1000) fail("structure");
    const token = instance.tokens.find((t) => !t.waiting);
    if (!token.queue.length) {
      instance.tokens = instance.tokens.filter((t) => t.id !== token.id);
      const joinId = token.joins.at(-1);
      if (joinId) {
        const join = instance.joins[joinId];
        join.remaining--;
        if (join.remaining === 0) {
          instance.tokens.push(join.continuation);
          delete instance.joins[joinId];
        }
      }
      continue;
    }
    const node = token.queue.shift();
    event(instance, "entered", node.id);
    if (["condition", "parallel"].includes(node.kind)) {
      const hits = node.branches
        .filter((b) => !b.fallback && evaluate(b.condition, instance.context))
        .sort((a, b) => a.priority - b.priority);
      const branches = hits.length
        ? node.kind === "condition"
          ? hits.slice(0, 1)
          : hits
        : node.branches.filter((b) => b.fallback);
      const joinId = randomUUID();
      instance.tokens = instance.tokens.filter((t) => t.id !== token.id);
      instance.joins[joinId] = {
        remaining: branches.length,
        continuation: { ...token, id: randomUUID() },
      };
      for (const b of branches)
        instance.tokens.push({
          id: randomUUID(),
          queue: structuredClone(b.nodes),
          joins: [...token.joins, joinId],
          executed: [...token.executed],
        });
      continue;
    }
    const assignees = resolve(node.assignment, instance.context);
    if (node.kind === "execute" && node.assignment.mode === "auto") {
      token.executed.push(node);
      event(instance, "autoCompleted", node.id);
      continue;
    }
    if (["execute", "review"].includes(node.kind)) {
      if (!assignees.length) fail("unresolved");
      token.waiting = true;
      instance.tasks.push({
        id: randomUUID(),
        tokenId: token.id,
        node,
        assignees,
        votes: [],
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      continue;
    }
    if (node.kind === "cc") {
      if (!assignees.length) fail("unresolved");
      instance.effects.push({
        type: "cc",
        nodeId: node.id,
        recipients: assignees,
      });
      event(instance, "copied", node.id);
      continue;
    }
    // External effects remain pending until a configured adapter confirms success.
    token.waiting = true;
    instance.tasks.push({
      id: randomUUID(),
      tokenId: token.id,
      node,
      assignees,
      status: "external",
      createdAt: new Date().toISOString(),
    });
    event(instance, "externalPending", node.id);
  }
  finish(instance);
}
export function act(instance, taskId, action, actor, comment = "") {
  if (instance.status !== "running") fail("instanceClosed");
  const task = instance.tasks.find(
    (t) => t.id === taskId && t.status === "pending",
  );
  if (!task) fail("taskMissing");
  if (!task.assignees.includes(actor)) throw new DomainError("forbidden", 403);
  const token = instance.tokens.find((t) => t.id === task.tokenId);
  if (!token) fail("taskMissing");
  if (task.node.kind === "review") {
    if (!["approve", "reject"].includes(action) || task.votes.includes(actor))
      fail("action");
    task.votes.push(actor);
    instance.context.approvalResult =
      action === "approve" ? "approved" : "rejected";
    event(instance, action, task.node.id, actor);
    instance.history.at(-1).comment = comment;
    if (action === "reject") {
      terminate(instance, "rejected", actor);
      return;
    }
    if (
      task.node.approval === "all" &&
      task.votes.length < task.assignees.length
    )
      return;
  } else {
    if (!["submit", "return"].includes(action)) fail("action");
    if (action === "return") {
      const previous = token.executed.at(-1);
      if (!previous) fail("noReturn");
      token.queue.unshift(previous, task.node);
      token.executed.pop();
      instance.context.returnCount = (instance.context.returnCount ?? 0) + 1;
    } else token.executed.push(task.node);
    event(instance, action, task.node.id, actor);
    instance.history.at(-1).comment = comment;
  }
  task.status = "completed";
  token.waiting = false;
  advance(instance);
}
export function terminate(instance, status, actor) {
  if (instance.status !== "running") fail("instanceClosed");
  instance.status = status;
  instance.tokens = [];
  instance.joins = {};
  instance.tasks
    .filter((t) => ["pending", "external"].includes(t.status))
    .forEach((t) => (t.status = "cancelled"));
  event(instance, status, undefined, actor);
  if (instance.definition.builtin === "extension")
    instance.effects.push({
      type: "extensionDeclined",
      activityId: instance.context.activityId,
    });
}
export function builtins() {
  const assignment = { mode: "projectRoles", ids: ["projectOwner"] };
  return [
    ["extension", "申请延期", "延期审批"],
    ["risk", "添加风险", "风险关闭确认"],
  ].map(([builtin, name, review]) => ({
    id: `builtin-${builtin}`,
    name,
    type: "project",
    description: "系统内置流程，结构锁定，仅可调整审核指派。",
    enabled: true,
    builtin,
    revision: 1,
    nodes: [
      {
        id: `${builtin}-execute`,
        kind: "execute",
        name: builtin === "extension" ? "系统自动完成" : "风险处置",
        assignment:
          builtin === "extension"
            ? { mode: "auto" }
            : { mode: "field", field: "responsible" },
      },
      {
        id: `${builtin}-review`,
        kind: "review",
        name: review,
        assignment: structuredClone(assignment),
        approval: "any",
      },
    ],
  }));
}

export function completeExternal(instance, taskId) {
  if (instance.status !== "running") fail("instanceClosed");
  const task = instance.tasks.find(
    (t) => t.id === taskId && t.status === "external",
  );
  if (!task) fail("taskMissing");
  const token = instance.tokens.find((t) => t.id === task.tokenId);
  if (!token) fail("taskMissing");
  task.status = "completed";
  token.waiting = false;
  event(instance, "externalCompleted", task.node.id);
  advance(instance);
}
