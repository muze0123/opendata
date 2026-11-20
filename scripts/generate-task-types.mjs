import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const schemas = JSON.parse(readFileSync(new URL('contracts/tasks/openapi.json', root), 'utf8')).components.schemas;
const names = { Error: 'ErrorResponse' };
const nameOf = name => names[name] ?? name;
function typeOf(schema) {
  if (schema.$ref) return nameOf(schema.$ref.split('/').at(-1));
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ');
  if (Array.isArray(schema.type)) return schema.type.map(type => typeOf({ ...schema, type })).join(' | ');
  if (schema.type === 'array') return `Array<${typeOf(schema.items)}>`;
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (['string', 'boolean', 'null'].includes(schema.type)) return schema.type;
  throw new Error(`Unsupported schema type ${JSON.stringify(schema)}`);
}
let output = '// Generated from contracts/tasks/openapi.json by pnpm contracts:generate.\n';
output += `export const TASK_STATUS_CODES = ${JSON.stringify(schemas.Task.properties.status.enum)} as const;\nexport type TaskStatus = typeof TASK_STATUS_CODES[number];\n`;
output += `export const TASK_ACTION_CODES = ${JSON.stringify(schemas.Action.properties.action.enum)} as const;\nexport type TaskAction = typeof TASK_ACTION_CODES[number];\n`;
for (const [name, schema] of Object.entries(schemas)) {
  output += `\nexport interface ${nameOf(name)} {\n`;
  for (const [key, property] of Object.entries(schema.properties)) {
    const type = name === 'Task' && key === 'status' ? 'TaskStatus' : name === 'Action' && key === 'action' ? 'TaskAction' : typeOf(property);
    output += `  ${key}${schema.required?.includes(key) ? '' : '?'}: ${type};\n`;
  }
  output += '}\n';
}
const path = new URL('frontend/src/modules/business-tasks/data/contracts.ts', root);
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('Task API types drifted. Run pnpm contracts:generate');
} else writeFileSync(path, output);
console.log('Task contract types verified');
