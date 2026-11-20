import { publishDefinition, synchronizeInstance } from "./warmflow.mjs";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  builtins,
  validateDefinition,
  validateAttachments,
  start,
  act,
  terminate,
  DomainError,
  dictionaries,
  completeExternal,
} from "./engine.mjs";
const directory = fileURLToPath(
  new URL("../../.workflow-data/", import.meta.url),
);
mkdirSync(directory, { recursive: true });
const db = new DatabaseSync(
  process.env.WORKFLOW_DB ?? `${directory}workflow.sqlite`,
);
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id));",
);
const all = (kind) =>
  db
    .prepare("SELECT data FROM records WHERE kind=?")
    .all(kind)
    .map((r) => JSON.parse(r.data));
const get = (kind, id) => {
  const r = db
    .prepare("SELECT data FROM records WHERE kind=? AND id=?")
    .get(kind, id);
  if (!r) throw new DomainError("missing", 404);
  return JSON.parse(r.data);
};
const put = (kind, item) =>
  db
    .prepare("INSERT OR REPLACE INTO records VALUES (?,?,?)")
    .run(kind, item.id, JSON.stringify(item));
for (const def of builtins())
  if (!all("definition").some((d) => d.id === def.id)) put("definition", def);
const requireValue = (value, code = "basic") => {
  if (!value) throw new DomainError(code);
};
function effects(instance) {
  for (const e of instance.effects.filter((e) => !e.applied)) {
    if (e.type === "extendActivity") {
      const a = get("activity", e.activityId);
      a.planEnd = new Date(Date.parse(a.planEnd) + e.days * 86400000)
        .toISOString()
        .slice(0, 10);
      a.extensionPending = false;
      put("activity", a);
    }
    if (e.type === "extensionDeclined") {
      const a = get("activity", e.activityId);
      a.extensionPending = false;
      put("activity", a);
    }
    if (e.type === "resolveRisk") {
      const r = get("risk", e.riskId);
      r.status = "resolved";
      put("risk", r);
    }
    if (
      ["extendActivity", "extensionDeclined", "resolveRisk", "cc"].includes(
        e.type,
      )
    )
      put("message", {
        id: randomUUID(),
        type: e.type,
        instanceId: instance.id,
        at: new Date().toISOString(),
        recipients: e.recipients ?? [instance.initiator],
      });
    e.applied = true;
  }
}
export function dispatch(method, path, body, actor) {
  const parts = path.split("/").filter(Boolean).slice(2),
    [resource, id, operation] = parts;
  if (method === "GET" && resource === "bootstrap")
    return {
      definitions: all("definition"),
      templates: all("template"),
      instances: all("instance"),
      activities: all("activity"),
      risks: all("risk"),
      messages: all("message"),
      dictionaries,
      adapters: Object.fromEntries(
        ["email", "sms", "lims", "tara"].map((channel) => [
          channel,
          Boolean(process.env[`WORKFLOW_${channel.toUpperCase()}_URL`]),
        ]),
      ),
    };
  if (resource === "definitions") {
    if (method === "POST" && !id) {
      validateDefinition({ ...body, nodes: [] }, false);
      requireValue(
        !all("definition").some(
          (d) => d.name.toLowerCase() === body.name.trim().toLowerCase(),
        ),
        "duplicate",
      );
      const d = {
        id: randomUUID(),
        name: body.name.trim(),
        type: body.type,
        description: body.description,
        enabled: false,
        revision: 1,
        nodes: [],
      };
      put("definition", d);
      return d;
    }
    const d = get("definition", id);
    if (method === "DELETE") {
      requireValue(!d.enabled && !d.builtin, "locked");
      requireValue(
        !all("instance").some((i) => i.definitionId === id),
        "referenced",
      );
      db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(
        "definition",
        id,
      );
      return {};
    }
    if (method === "PUT") {
      requireValue(body.revision === d.revision, "conflict");
      if (operation === "status") {
        if (body.enabled) validateDefinition(d);
        d.enabled = !!body.enabled;
      } else {
        requireValue(!d.enabled, "locked");
        requireValue(body.type === d.type, "locked");
        validateDefinition(body);
        requireValue(
          !all("definition").some(
            (v) =>
              v.id !== id &&
              v.name.toLowerCase() === body.name.trim().toLowerCase(),
          ),
          "duplicate",
        );
        if (d.builtin) {
          const canonical = structuredClone(d.nodes),
            incoming = structuredClone(body.nodes);
          canonical
            .filter((n) => n.kind === "review")
            .forEach((n) => {
              delete n.assignment;
              delete n.approval;
            });
          incoming
            .filter((n) => n.kind === "review")
            .forEach((n) => {
              delete n.assignment;
              delete n.approval;
            });
          requireValue(
            JSON.stringify(canonical) === JSON.stringify(incoming) &&
              body.name === d.name,
            "locked",
          );
        }
        Object.assign(d, {
          name: body.name.trim(),
          description: body.description,
          nodes: body.nodes,
        });
      }
      d.revision++;
      put("definition", d);
      return d;
    }
  }
  if (resource === "templates") {
    if (method === "POST" || method === "PUT") {
      requireValue(
        ["email", "sms"].includes(body.channel) &&
          body.name?.trim() &&
          body.name.length <= 20 &&
          body.title?.trim() &&
          body.title.length <= 20 &&
          body.content?.trim() &&
          body.content.length <= 500,
        "message",
      );
      requireValue(
        !all("template").some((t) => t.id !== id && t.name.toLowerCase() === body.name.trim().toLowerCase()),
        "duplicate",
      );
      validateAttachments(body.attachments);
      if (id) get("template", id);
      const item = { ...body, name: body.name.trim(), id: id ?? randomUUID() };
      put("template", item);
      return item;
    }
    if (method === "DELETE") {
      get("template", id);
      requireValue(
        !all("definition").some((d) => JSON.stringify(d.nodes).includes(id)),
        "referenced",
      );
      db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(
        "template",
        id,
      );
      return {};
    }
  }
  if (resource === "instances") {
    if (method === "POST" && !id) {
      const d = get("definition", body.definitionId);
      const context = body.context ?? {};
      context.returnCount = 0;
      if (d.builtin) {
        requireValue(
          context.activityId && context.projectRoles?.projectOwner?.length,
          "context",
        );
        const activity = get("activity", context.activityId);
        if (d.builtin === "extension") {
          requireValue(
            !activity.extensionPending &&
              Number.isInteger(context.extensionDays) &&
              context.extensionDays > 0 &&
              context.extensionDays <= 365,
            "context",
          );
          activity.extensionPending = true;
          put("activity", activity);
        } else {
          requireValue(
            context.responsible && context.riskDescription?.trim(),
            "context",
          );
          const risk = {
            id: randomUUID(),
            activityId: activity.id,
            description: context.riskDescription,
            responsible: context.responsible,
            status: "processing",
          };
          put("risk", risk);
          context.riskId = risk.id;
        }
      }
      const instance = start(d, context, actor);
      effects(instance);
      put("instance", instance);
      return instance;
    }
    if (method === "POST" && id) {
      const i = get("instance", id);
      requireValue(body.revision === i.revision, "conflict");
      if (operation === "action")
        act(i, body.taskId, body.action, actor, body.comment);
      else if (operation === "withdraw") {
        requireValue(i.initiator === actor, "forbidden");
        terminate(i, "withdrawn", actor);
      } else if (operation === "cancel") terminate(i, "cancelled", actor);
      else throw new DomainError("missing", 404);
      i.revision = (i.revision ?? 0) + 1;
      effects(i);
      put("instance", i);
      return i;
    }
  }
  if (resource === "activities" && method === "POST") {
    requireValue(
      body.name?.trim() &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.planEnd) &&
        Number.isFinite(Date.parse(body.planEnd)),
      "context",
    );
    const item = {
      id: randomUUID(),
      name: body.name,
      planEnd: body.planEnd,
      extensionPending: false,
    };
    put("activity", item);
    return item;
  }
  throw new DomainError("missing", 404);
}
let requests = Promise.resolve();
const server = http.createServer((req, res) => {
  requests = requests.then(() => handleRequest(req, res)).catch(() => {
    if (!res.writableEnded) { res.statusCode = 500; res.end(JSON.stringify({ code: "server" })); }
  });
});
async function handleRequest(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.url === "/api/workflow/health") {
      res.end(JSON.stringify({ ok: true, mode: "local-development" }));
      return;
    }
    // The host project has mock authentication. This service intentionally listens on loopback only.
    if (!req.headers.authorization?.startsWith("Bearer mock-token-"))
      throw new DomainError("unauthorized", 401);
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin)
    )
      throw new DomainError("forbidden", 403);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 100_000_000) throw new DomainError("tooLarge", 413);
    }
    const body = raw ? JSON.parse(raw) : {};
    const requestPath = new URL(req.url, "http://localhost").pathname;
    const retry = requestPath.match(
      /^\/api\/workflow\/instances\/([^/]+)\/retry$/,
    );
    if (req.method === "POST" && retry) {
      const instance = get("instance", retry[1]);
      requireValue(instance.revision === body.revision, "conflict");
      const task = instance.tasks.find(
        (t) => t.id === body.taskId && t.status === "external",
      );
      requireValue(task && instance.status === "running", "taskMissing");
      const prefix = `WORKFLOW_${task.node.kind.toUpperCase()}`;
      const url = process.env[`${prefix}_URL`];
      requireValue(url, "adapterMissing");
      const endpoint = new URL(url);
      requireValue(
        ["http:", "https:"].includes(endpoint.protocol),
        "adapterMissing",
      );
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": task.id,
          ...(process.env[`${prefix}_TOKEN`]
            ? { Authorization: `Bearer ${process.env[`${prefix}_TOKEN`]}` }
            : {}),
        },
        body: JSON.stringify({
          instanceId: instance.id,
          nodeId: task.node.id,
          recipients: task.assignees,
          message: task.node.message,
          context: instance.context,
        }),
      });
      requireValue(response.ok, "adapterFailed");
      const confirmation = await response.json();
      requireValue(confirmation.completed === true, "adapterPending");
      db.exec("BEGIN IMMEDIATE");
      try {
        const latest = get("instance", instance.id);
        requireValue(latest.revision === body.revision, "conflict");
        const before = structuredClone(latest);
        completeExternal(latest, task.id);
        latest.revision = (latest.revision ?? 0) + 1;
        await synchronizeInstance(before, latest, "external", task.id);
        effects(latest);
        put("instance", latest);
        db.exec("COMMIT");
        res.end(JSON.stringify(latest));
        return;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      const instanceMatch = requestPath.match(/^\/api\/workflow\/instances\/([^/]+)\//);
      const before = instanceMatch ? get("instance", instanceMatch[1]) : undefined;
      const result = dispatch(
        req.method,
        new URL(req.url, "http://localhost").pathname,
        body,
        "u-admin",
      );
      if (req.method === "POST" && /^\/api\/workflow\/instances(?:\/[^/]+\/(?:action|withdraw|cancel))?$/.test(requestPath)) {
        await synchronizeInstance(before, result, body.action, body.taskId);
        put("instance", result);
      }
      // The standard launcher configures Warm-Flow. Legacy isolated unit tests
      // can still exercise the business repository without a Java process.
      if (process.env.WORKFLOW_LEGACY_ENGINE !== "1" && req.method === "PUT" &&
          /^\/api\/workflow\/definitions\/[^/]+\/status$/.test(requestPath) && result.enabled) {
        result.engine = await publishDefinition(result);
        put("definition", result);
      }
      db.exec("COMMIT");
      res.end(JSON.stringify(result));
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } catch (e) {
    res.statusCode =
      e instanceof DomainError
        ? e.status
        : e instanceof SyntaxError
          ? 400
          : 500;
    res.end(
      JSON.stringify({
        code:
          e instanceof DomainError
            ? e.code
            : res.statusCode === 400
              ? "basic"
              : "server",
      }),
    );
  }
}
server.listen(Number(process.env.WORKFLOW_PORT ?? 4318), "127.0.0.1", () =>
  console.log("Workflow service: http://127.0.0.1:4318 (local development)"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
