import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const testEnvironment = {
  ...process.env,
  EXPENSO_NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: "false",
  NEXT_PUBLIC_AUTH_APPLE_ENABLED: "false",
  NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED: "false",
};

const server = spawn(process.execPath, ["tests/e2e-server.mjs"], {
  cwd: process.cwd(),
  env: testEnvironment,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`E2E server exited before becoming ready.\n${serverOutput}`);
    try {
      const response = await fetch("http://127.0.0.1:3100/login");
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`E2E server did not become ready.\n${serverOutput}`);
}

async function stopServer() {
  if (server.exitCode !== null || !server.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

let exitCode = 1;
try {
  await waitForServer();
  const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
    cwd: process.cwd(),
    env: testEnvironment,
    stdio: "inherit",
  });
  const [code] = await once(runner, "exit");
  exitCode = typeof code === "number" ? code : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  await stopServer();
}

process.exit(exitCode);
