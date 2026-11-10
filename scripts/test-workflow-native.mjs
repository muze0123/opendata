import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'warmflow-native-test-'));
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const token = randomBytes(32).toString('hex');
const env = { ...process.env, WARMFLOW_PORT: String(port), WARMFLOW_URL: `http://127.0.0.1:${port}`,
  WARMFLOW_BRIDGE_TOKEN: token, WARMFLOW_DATABASE_URL: `jdbc:h2:file:${join(directory, 'engine')};MODE=MySQL;DATABASE_TO_LOWER=TRUE` };
const service = spawn('mvn', ['-f', 'server/warmflow/pom.xml', 'spring-boot:run'], { env, stdio: 'inherit', detached: true });
let exited = false;
service.on('exit', () => { exited = true; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 180 && !exited; attempt++) {
    try {
      const response = await fetch(`${env.WARMFLOW_URL}/internal/engine/health`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1000),
      });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the isolated engine to start. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Warm-Flow test service failed to start');
  const result = spawn(process.execPath, ['--test', 'server/workflow/api.test.mjs', 'server/workflow/native-api.test.mjs'], { env, stdio: 'inherit' });
  process.exitCode = await new Promise(resolve => result.on('exit', code => resolve(code ?? 1)));
} finally {
  if (!exited) {
    process.kill(-service.pid, 'SIGTERM');
    await new Promise(resolve => service.once('exit', resolve));
  }
  rmSync(directory, { recursive: true, force: true });
}
