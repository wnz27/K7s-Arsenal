import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codexOut = resolve(root, "codex-plugin/msg-tool/server.js");
const claudeOut = resolve(root, "claude-plugin/msg-tool/server.js");

await mkdir(dirname(codexOut), { recursive: true });
await mkdir(dirname(claudeOut), { recursive: true });

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: codexOut,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: []
});

await copyFile(codexOut, claudeOut);
