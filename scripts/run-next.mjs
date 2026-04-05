import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const nextBin = resolve(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const command = process.argv[2];
const allowed = new Set(["dev", "build", "start"]);
const nextCommand = allowed.has(command) ? command : "dev";
const extraArgs = process.argv.slice(3);

const child = spawn(process.execPath, [nextBin, nextCommand, ...extraArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    INIT_CWD: projectRoot,
    PWD: projectRoot,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
