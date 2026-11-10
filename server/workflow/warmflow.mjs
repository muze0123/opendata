import { validateDefinition, DomainError } from './engine.mjs';

const quoted = (value) => `'${String(value).replaceAll("'", "''")}'`;
function condition(tree) {
  if (tree.children) return `(${tree.children.map(condition).join(tree.logic === 'and' ? ' and ' : ' or ')})`;
  const field = `#${tree.field}`;
  if (tree.operator === 'empty') return `${field} == null`;
  if (tree.operator === 'notEmpty') return `${field} != null`;
  const value = typeof tree.value === 'number' ? tree.value : quoted(tree.value);
  if (['in', 'notIn'].includes(tree.operator)) {
    const comparisons = tree.value.map(v => `${field} == ${quoted(v)}`).join(' or ');
    return `(${field} != null and ${tree.operator === 'notIn' ? '!' : ''}(${comparisons}))`;
  }
  const operator = { eq: '==', ne: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' }[tree.operator];
  return `(${field} != null and ${field} ${operator} ${value})`;
}
function permissions(assignment) {
  if (assignment.mode === 'members') return assignment.ids.join('@@');
  if (assignment.mode === 'auto') return '__system__';
  if (assignment.mode === 'field') return '#{#responsible}';
  const source = assignment.mode === 'projectRoles' ? 'projectRoles' : 'roles';
  return assignment.ids.map(id => `#{#${source}[${quoted(id)}]}`).join('@@');
}

/** Compile the validated, closed business model to native Warm-Flow nodes and gateways.
 * No user-supplied expression, class name or listener is accepted.
 */
export function compileDefinition(definition) {
  validateDefinition(definition);
  const nodes = [];
  const add = (nodeCode, nodeType, nodeName) => {
    const node = { nodeCode, nodeType, nodeName, skipList: [] };
    nodes.push(node);
    return node;
  };
  const link = (from, to, expression) => {
    from.skipList.push({ nowNodeCode: from.nodeCode, nextNodeCode: to, skipType: 'PASS',
      ...(expression ? { skipCondition: `spel@@#{${expression}}` } : {}) });
  };
  const end = add('__end__', 2, 'End');
  function sequence(list, next) {
    let entry = next;
    for (const node of [...list].reverse()) {
      if (['condition', 'parallel'].includes(node.kind)) {
        // Conditional parallel execution is an inclusive gateway in Warm-Flow.
        const type = node.kind === 'parallel' ? 5 : 3;
        const split = add(node.id, type, node.name || node.kind);
        const join = add(`${node.id}_join`, type, 'Join');
        link(join, entry);
        const branches = node.branches.filter(b => !b.fallback).sort((a,b) => a.priority-b.priority);
        const expressions = branches.map(b => condition(b.condition));
        for (let index = 0; index < branches.length; index++) {
          const previous = expressions.slice(0, index);
          const expression = type === 3 && previous.length
            ? `!(${previous.join(' or ')}) and ${expressions[index]}` : expressions[index];
          link(split, sequence(branches[index].nodes, join.nodeCode), expression);
        }
        const fallback = node.branches.find(b => b.fallback);
        link(split, sequence(fallback.nodes, join.nodeCode), `!(${expressions.join(' or ')})`);
        entry = split.nodeCode;
      } else {
        const native = add(node.id, 1, node.name || node.kind);
        native.permissionFlag = permissions(node.assignment);
        native.nodeRatio = node.kind === 'review' && node.approval === 'all' ? '100' : '0';
        native.ext = JSON.stringify({ kind: node.kind, assignmentMode: node.assignment.mode });
        link(native, entry);
        entry = native.nodeCode;
      }
    }
    return entry;
  }
  const start = add('__start__', 0, 'Submit');
  link(start, sequence(definition.nodes, end.nodeCode));
  return { flowCode: definition.id, flowName: definition.name, version: String(definition.revision),
    modelValue: 'CLASSICS', category: definition.type, nodeList: nodes };
}

export async function publishDefinition(definition) {
  const base = process.env.WARMFLOW_URL;
  const token = process.env.WARMFLOW_BRIDGE_TOKEN;
  if (!base || !token) throw new DomainError('engineUnavailable', 503);
  const response = await fetch(`${base}/internal/engine/deploy`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(compileDefinition(definition)),
  });
  if (!response.ok) throw new DomainError('engineUnavailable', 503);
  return response.json();
}

async function engineCall(path, body) {
  const response = await fetch(`${process.env.WARMFLOW_URL}/internal/engine/${path}`, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WARMFLOW_BRIDGE_TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new DomainError('engineUnavailable', 503);
  return response.json();
}
const command = (key, operation, body) => engineCall('commands', { key, operation, body });

/** Warm-Flow executes the native graph. The business record retains its existing
 * presentation/audit projection and business hooks. Commands are persisted and
 * replayable across an API retry, before the local business transaction commits.
 */
export async function synchronizeInstance(before, after, action, taskId, actor = 'u-admin') {
  if (!process.env.WARMFLOW_URL) {
    if (process.env.WORKFLOW_LEGACY_ENGINE === '1') return;
    throw new DomainError('engineUnavailable', 503);
  }
  const key = `${after.id}:${after.revision ?? 0}`;
  if (!before) {
    await publishDefinition(after.definition);
    const native = await command(`${key}:start`, 'start', { businessId: after.id,
      flowCode: after.definitionId, actor, variables: after.context });
    after.engineInstanceId = native.id;
  } else if (!before.engineInstanceId) {
    // Existing instances retain the engine snapshot under which they started.
    return;
  } else {
    after.engineInstanceId = before.engineInstanceId;
    if (after.status !== 'running' && after.status !== 'completed') {
      await command(`${key}:terminate`, 'terminate', { instanceId: after.engineInstanceId, actor });
      return;
    }
    const nativeTasks = await engineCall(`instances/${after.engineInstanceId}/tasks`);
    const original = before.tasks.find(t => t.id === taskId);
    const nativeTask = [...nativeTasks, ...(before.engineTasks ?? [])].find(t => t.nodeCode === original?.node.id);
    if (!nativeTask) throw new DomainError('engineUnavailable', 503);
    const handler = action === 'external' ? nativeTask.permissions[0] : actor;
    const parameters = { handler, permissionFlag: [handler], skipType: action === 'return' ? 'REJECT' : 'PASS', variable: after.context };
    if (action === 'return') {
      const returned = after.tasks.find(t => t.status === 'pending' && !before.tasks.some(b => b.id === t.id));
      parameters.nodeCode = returned?.node.id;
    }
    await command(`${key}:complete`, 'complete', { taskId: nativeTask.id, parameters });
  }
  const nodes = new Map();
  function collect(list) { for (const node of list) { nodes.set(node.id, node); for (const branch of node.branches ?? []) collect(branch.nodes); } }
  collect(after.definition.nodes);
  // System execution and copying are immediate business actions. Other external
  // nodes stay pending until their configured adapter confirms completion.
  for (let iteration = 0; iteration < 1000; iteration++) {
    const nativeTasks = await engineCall(`instances/${after.engineInstanceId}/tasks`);
    const automatic = nativeTasks.find(task => {
      const node = nodes.get(task.nodeCode);
      return node?.kind === 'cc' || node?.assignment.mode === 'auto';
    });
    if (!automatic) {
      const expected = after.tasks.filter(t => ['pending', 'external'].includes(t.status)).map(t => t.node.id).sort();
      const actual = nativeTasks.map(t => t.nodeCode).sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new DomainError('engineUnavailable', 503);
      after.engineTasks = nativeTasks;
      return;
    }
    const handler = automatic.permissions[0] ?? '__system__';
    await command(`auto:${automatic.id}`, 'complete', { taskId: automatic.id,
      parameters: { handler, permissionFlag: [handler], skipType: 'PASS', variable: after.context } });
  }
  throw new DomainError('structure');
}
