import { spawn } from "node:child_process";
const processes = [
  spawn(process.execPath, ["server/workflow/server.mjs"], { stdio: "inherit" }),
  spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1"], { stdio: "inherit" }),
];
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  processes.forEach((p) => p.kill("SIGTERM"));
}
processes.forEach((p) => p.on("exit", stop));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
