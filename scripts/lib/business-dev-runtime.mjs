import { createServer } from 'node:net';

export async function selectDevPort(preferred, { explicit = false, exclude = [] } = {}) {
  if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535) throw new Error('开发端口必须是 1–65535 的整数');
  for (let port = preferred; port <= Math.min(65535, preferred + 100); port++) {
    if (exclude.includes(port)) {
      if (explicit) throw new Error(`前后端不能使用相同端口 ${port}`);
      continue;
    }
    const probe = createServer();
    try {
      await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
      await new Promise(resolve => probe.close(resolve));
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      if (explicit) throw new Error(`端口 ${port} 已被占用，请停止原服务或修改对应的端口环境变量`);
    }
  }
  throw new Error(`从 ${preferred} 起未找到可用开发端口`);
}

export async function matchesSession(port, env) {
  if (!env.OPENDATA_DEV_TOKEN) return false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/opendata/v1/session`, {
      headers: { Authorization: `Bearer ${env.OPENDATA_DEV_TOKEN}`, 'X-Dev-Tenant': env.OPENDATA_DEV_TENANT, 'X-Dev-User': env.OPENDATA_DEV_USER },
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    const session = await response.json();
    return session.userId === env.OPENDATA_DEV_USER && session.tenantId === env.OPENDATA_DEV_TENANT;
  } catch { return false; }
}
