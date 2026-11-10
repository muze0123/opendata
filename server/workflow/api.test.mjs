import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("HTTP persistence, optimistic locking, transactional business hooks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "workflow-test-")),
    port = 14318;
  let service;
  const launch = async () => {
    service = spawn(process.execPath, ["server/workflow/server.mjs"], {
      env: {
        ...process.env,
        WORKFLOW_LEGACY_ENGINE: process.env.WARMFLOW_URL ? "0" : "1",
        WORKFLOW_DB: join(dir, "test.sqlite"),
        WORKFLOW_PORT: String(port),
      },
      stdio: "pipe",
    });
    await new Promise((resolve, reject) => {
      service.stdout.once("data", resolve);
      service.once("error", reject);
    });
  };
  const call = async (path, method = "GET", body) => {
    const r = await fetch(`http://127.0.0.1:${port}/api/workflow/${path}`, {
      method,
      headers: {
        Authorization: "Bearer mock-token-test",
        "Content-Type": "application/json",
      },
      body: body && JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  const stop = () =>
    new Promise((resolve) => {
      service.once("exit", resolve);
      service.kill("SIGTERM");
    });
  try {
    await launch();
    let state = (await call("bootstrap")).data;
    assert.equal(state.definitions.length, 2);
    const a = (
      await call("activities", "POST", {
        name: "Safety",
        planEnd: "2026-11-10",
      })
    ).data;
    const bad = await call("instances", "POST", {
      definitionId: "builtin-extension",
      context: {
        activityId: a.id,
        extensionDays: 2,
        projectRoles: { projectOwner: [] },
      },
    });
    assert.equal(bad.status, 422);
    const i = (
      await call("instances", "POST", {
        definitionId: "builtin-extension",
        context: {
          activityId: a.id,
          extensionDays: 2,
          projectRoles: { projectOwner: ["u-admin"] },
        },
      })
    ).data;
    assert.equal(i.status, "running");
    const duplicate = await call("instances", "POST", {
      definitionId: "builtin-extension",
      context: {
        activityId: a.id,
        extensionDays: 2,
        projectRoles: { projectOwner: ["u-admin"] },
      },
    });
    assert.equal(duplicate.status, 422);
    const done = await call(`instances/${i.id}/action`, "POST", {
      taskId: i.tasks[0].id,
      action: "approve",
    });
    assert.equal(done.data.status, "completed");
    state = (await call("bootstrap")).data;
    assert.equal(state.activities[0].planEnd, "2026-11-12");
    assert.equal(state.activities[0].extensionPending, false);
    assert.equal(state.messages.length, 1);
    const d = (
      await call("definitions", "POST", {
        name: "Version test",
        type: "normal",
        description: "",
      })
    ).data;
    const conflict = await call(`definitions/${d.id}/status`, "PUT", {
      revision: 0,
      enabled: false,
    });
    assert.equal(conflict.data.code, "conflict");
    await stop();
    await launch();
    state = (await call("bootstrap")).data;
    assert.equal(state.instances[0].status, "completed");
    assert.equal(state.activities[0].planEnd, "2026-11-12");
    assert.ok(state.definitions.find((v) => v.id === d.id));
  } finally {
    if (service?.exitCode === null) await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
