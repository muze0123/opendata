import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { selectDevPort, matchesSession } from './lib/business-dev-runtime.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
async function main() {
  const preferredBackend = Number(process.env.OPENDATA_PORT || 4320);
  const preferredFrontend = Number(process.env.OPENDATA_FRONTEND_PORT || 5173);
  const env = {
    ...process.env,
    OPENDATA_DEV_TOKEN: process.env.OPENDATA_DEV_TOKEN || randomBytes(32).toString('hex'),
    OPENDATA_DEV_TENANT: process.env.OPENDATA_DEV_TENANT || 'local-tenant',
    OPENDATA_DEV_USER: process.env.OPENDATA_DEV_USER || 'alice',
    OPENDATA_PORT: String(preferredBackend),
  };
  for (const name of ['OPENDATA_DEV_TENANT', 'OPENDATA_DEV_USER']) {
    if (!/^[A-Za-z0-9._:@-]{1,128}$/.test(env[name])) throw new Error(`${name} must be an ASCII identifier`);
  }
  const reuseBackend = await matchesSession(preferredBackend, env);
  const backendPort = reuseBackend ? preferredBackend : await selectDevPort(preferredBackend, { explicit: Boolean(process.env.OPENDATA_PORT) });
  const frontendPort = await selectDevPort(preferredFrontend, { explicit: Boolean(process.env.OPENDATA_FRONTEND_PORT), exclude: [backendPort] });
  env.OPENDATA_PORT = String(backendPort);
  if (backendPort !== preferredBackend) console.log(`后端端口 ${preferredBackend} 已占用，改用 ${backendPort}`);
  if (frontendPort !== preferredFrontend) console.log(`前端端口 ${preferredFrontend} 已占用，改用 ${frontendPort}`);
  if (!reuseBackend) {
    const data = process.env.OPENDATA_LOCAL_DATA_DIR ? resolve(root, 'backend/application', process.env.OPENDATA_LOCAL_DATA_DIR) : resolve(root, 'backend/application/.local-data/postgres');
    let pid;
    try { pid = Number((await readFile(resolve(data, 'postmaster.pid'), 'utf8')).split('\n')[0]); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (Number.isInteger(pid) && pid > 0) {
      let running = true;
      try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') running = false; else throw error; }
      if (running) throw new Error(`已有本地数据库正在运行：${data}。请在原 backend:dev 终端按 Ctrl+C 后重试；或设置与原服务一致的 OPENDATA_DEV_TOKEN 以复用服务。现有服务和数据未修改。`);
    }
  }
  const children = [];
  let closing = false;
  function stop(code = 0) {
    if (closing) return;
    closing = true; process.exitCode = code;
    for (const child of children) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
    }
  }
  function launch(command, args) {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', detached: true });
    children.push(child);
    child.on('error', error => { console.error(error.message); stop(1); });
    child.on('exit', code => { if (!closing) stop(code || 1); });
    return child;
  }
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  if (reuseBackend) console.log(`复用已认证的业务后端：127.0.0.1:${backendPort}（退出时保留该服务）`);
  else launch('pnpm', ['backend:dev']);
  let ready = reuseBackend;
  for (let attempt = 0; attempt < 120 && !closing && !ready; attempt++) {
    ready = await matchesSession(backendPort, env);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) {
    if (!closing) console.error('OpenData backend did not become ready. Review the service output.');
    stop(1);
  } else if (!closing) {
    launch('pnpm', ['--dir', 'frontend', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort']);
    console.log(`Business tasks: http://127.0.0.1:${frontendPort}/tasks/business`);
  }

}
main().catch(error => { console.error(`启动失败：${error.message}`); process.exitCode = 1; });
