#!/usr/bin/env node
/**
 * The renderer API is declared in three places that must agree:
 *   electron/main.ts      - ipcMain.handle channels
 *   electron/preload.ts   - the contextBridge surface
 *   src/types/window.d.ts - what TypeScript lets the renderer call
 *
 * Nothing enforces that at build time, and a drift between them silently
 * stranded the cursor-pagination work: the renderer called a four-argument
 * method that the shipped preload forwarded as two. This check fails loudly
 * instead.
 */
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const main = read("electron/main.ts");
const preload = read("electron/preload.ts");
const dts = read("src/types/window.d.ts");

const channels = [...preload.matchAll(/invoke\(\s*"([^"]+)"/g)].map((m) => m[1]);
const handlers = [
  ...main.matchAll(/ipcMain\.handle\(\s*\n?\s*"([^"]+)"/g),
].map((m) => m[1]);
const exposed = [...preload.matchAll(/^ {2}([a-zA-Z]+):\s*\(/gm)].map((m) => m[1]);
const declared = [...dts.matchAll(/^ {2}([a-zA-Z]+):\s*\(/gm)].map((m) => m[1]);

const problems = [];
const report = (label, list) => {
  if (list.length) problems.push(`${label}: ${list.join(", ")}`);
};

report(
  "preload invokes channels with no ipcMain.handle",
  channels.filter((c) => !handlers.includes(c))
);
report(
  "ipcMain handlers no preload method invokes",
  handlers.filter((h) => !channels.includes(h))
);
report(
  "declared in window.d.ts but not exposed by preload",
  declared.filter((m) => !exposed.includes(m))
);
report(
  "exposed by preload but not declared in window.d.ts",
  exposed.filter((m) => !declared.includes(m))
);

if (problems.length) {
  console.error("IPC surface is out of sync:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}

console.log(
  `IPC surface in sync: ${handlers.length} handlers, ${exposed.length} preload methods, ${declared.length} declarations.`
);
