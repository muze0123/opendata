import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Warm-Flow HTTP gateway selection, joins, return, risk and withdrawal', { skip: !process.env.WARMFLOW_URL }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'native-workflow-'));
  const adapter = http.createServer((request, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ completed: true })); });
  await new Promise(resolve => adapter.listen(0, '127.0.0.1', resolve));
  const adapterPort = adapter.address().port;
  const service = spawn(process.execPath, ['server/workflow/server.mjs'], {
    env: { ...process.env, WORKFLOW_EMAIL_URL: `http://127.0.0.1:${adapterPort}`, WORKFLOW_PORT: '14328', WORKFLOW_DB: join(directory, 'business.sqlite') }, stdio: 'pipe',
  });
  await new Promise((resolve, reject) => { service.stdout.once('data', resolve); service.once('error', reject); });
  async function call(path, method = 'GET', body) {
    const response = await fetch(`http://127.0.0.1:14328/api/workflow/${path}`, {
      method, headers: { Authorization: 'Bearer mock-token-test', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  }
  const execute = id => ({ id, kind: 'execute', assignment: { mode: 'members', ids: ['u-admin'] }, approval: 'any' });
  const pending = instance => instance.tasks.filter(t => t.status === 'pending');
  const act = (instance, task, action = 'submit') => call(`instances/${instance.id}/action`, 'POST', { revision: instance.revision, taskId: task.id, action });
  try {
    for (const scenario of ['condition', 'parallel', 'fallback']) {
      const kind = scenario === 'fallback' ? 'condition' : scenario;
      let definition = await call('definitions', 'POST', { name: scenario, type: 'normal', description: '' });
      definition.nodes = [execute('before'), { id: 'gateway', kind, branches: ['first', 'second', 'fallback'].map((id, index) => ({
        id, priority: index + 1, fallback: index === 2,
        condition: { logic: 'and', children: [{ field: 'returnCount', operator: 'gte', value: scenario === 'fallback' ? 10 : 0 }] }, nodes: [execute(id)],
      })) }, execute('after')];
      definition = await call(`definitions/${definition.id}`, 'PUT', definition);
      definition = await call(`definitions/${definition.id}/status`, 'PUT', { revision: definition.revision, enabled: true });
      let instance = await call('instances', 'POST', { definitionId: definition.id, context: {} });
      assert.ok(instance.engineInstanceId);
      instance = await act(instance, pending(instance)[0]);
      assert.equal(pending(instance).length, kind === 'parallel' ? 2 : 1);
      if (scenario === 'fallback') assert.equal(pending(instance)[0].node.id, 'fallback');
      for (const task of [...pending(instance)]) instance = await act(instance, task);
      assert.equal(pending(instance)[0].node.id, 'after');
      instance = await act(instance, pending(instance)[0]);
      assert.equal(instance.status, 'completed');
    }
    let definition = await call('definitions', 'POST', { name: 'Return native', type: 'normal', description: '' });
    definition.nodes = [execute('first'), execute('second')];
    definition = await call(`definitions/${definition.id}`, 'PUT', definition);
    definition = await call(`definitions/${definition.id}/status`, 'PUT', { revision: definition.revision, enabled: true });
    let instance = await call('instances', 'POST', { definitionId: definition.id, context: {} });
    instance = await act(instance, pending(instance)[0]);
    instance = await act(instance, pending(instance)[0], 'return');
    assert.equal(pending(instance)[0].node.id, 'first');
    assert.equal(instance.context.returnCount, 1);
    let notification = await call('definitions', 'POST', { name: 'Native notification', type: 'normal', description: '' });
    notification.nodes = [{ ...execute('mail'), kind: 'email', message: { source: 'custom', title: 'Notice', content: 'Content', attachments: [] } }];
    notification = await call(`definitions/${notification.id}`, 'PUT', notification);
    notification = await call(`definitions/${notification.id}/status`, 'PUT', { revision: notification.revision, enabled: true });
    let external = await call('instances', 'POST', { definitionId: notification.id, context: {} });
    assert.equal(external.tasks[0].status, 'external');
    external = await call(`instances/${external.id}/retry`, 'POST', { revision: external.revision, taskId: external.tasks[0].id });
    assert.equal(external.status, 'completed');
    const activity = await call('activities', 'POST', { name: 'Activity', planEnd: '2026-11-10' });
    instance = await call('instances', 'POST', { definitionId: 'builtin-risk', context: {
      activityId: activity.id, responsible: 'u-admin', riskDescription: 'Risk', projectRoles: { projectOwner: ['u-admin'] },
    } });
    instance = await act(instance, pending(instance)[0]);
    instance = await act(instance, pending(instance)[0], 'approve');
    assert.equal(instance.status, 'completed');
    let state = await call('bootstrap');
    assert.equal(state.risks[0].status, 'resolved');
    instance = await call('instances', 'POST', { definitionId: 'builtin-extension', context: {
      activityId: activity.id, extensionDays: 2, projectRoles: { projectOwner: ['u-admin'] },
    } });
    await call(`instances/${instance.id}/withdraw`, 'POST', { revision: instance.revision });
    state = await call('bootstrap');
    assert.equal(state.activities[0].extensionPending, false);
    assert.equal(state.activities[0].planEnd, '2026-11-10');
  } finally {
    await new Promise(resolve => { service.once('exit', resolve); service.kill('SIGTERM'); });
    await new Promise(resolve => adapter.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
