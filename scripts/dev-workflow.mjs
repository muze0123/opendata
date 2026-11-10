import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const token = process.env.WARMFLOW_BRIDGE_TOKEN || randomBytes(32).toString('hex');
const warmPort = process.env.WARMFLOW_PORT || '4319';
const env = { ...process.env, WARMFLOW_BRIDGE_TOKEN: token,
  WARMFLOW_URL: `http://127.0.0.1:${warmPort}` };
const processes = [];
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  processes.forEach(p => {
    try { process.kill(-p.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  });
}
function launch(command, args) {
  const child = spawn(command, args, { env, stdio: 'inherit', detached: true });
  processes.push(child);
  child.on('error', error => { console.error(error.message); stop(); });
  child.on('exit', stop);
  return child;
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
launch('mvn', ['-f', 'server/warmflow/pom.xml', 'spring-boot:run']);
let ready = false;
for (let attempt = 0; attempt < 180 && !closing; attempt++) {
  try {
    const response = await fetch(`${env.WARMFLOW_URL}/internal/engine/health`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1000),
    });
    if (response.ok) { ready = true; break; }
  } catch { /* The child is still starting. */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) {
  console.error('Warm-Flow did not become ready. Check the Java service output.');
  stop();
  process.exitCode = 1;
} else {
  launch(process.execPath, ['server/workflow/server.mjs']);
  launch('pnpm', ['exec', 'vite', '--host', '127.0.0.1']);
}
