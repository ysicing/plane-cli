#!/usr/bin/env node

import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function resolveCodexHome() {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error("Cannot resolve home directory for Codex skill installation.");
  }
  return join(home, ".codex");
}

export async function installBundledSkills({
  sourceRoot = join(__dirname, "..", "skills"),
  targetRoot = join(resolveCodexHome(), "skills"),
} = {}) {
  if (!existsSync(sourceRoot)) {
    return { installed: [] };
  }

  await mkdir(targetRoot, { recursive: true });
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const installed = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sourcePath = join(sourceRoot, entry.name);
    const targetPath = join(targetRoot, entry.name);
    await cp(sourcePath, targetPath, { recursive: true, force: true });
    installed.push(entry.name);
  }

  return { installed, targetRoot };
}

async function main() {
  if (process.env.PLANE_CLI_SKIP_SKILL_INSTALL === "1") {
    return;
  }

  try {
    const result = await installBundledSkills();
    if (result.installed.length > 0) {
      console.log(`plane-cli: installed Codex skills -> ${result.installed.join(", ")}`);
    }
  } catch (error) {
    console.warn(`plane-cli: failed to install Codex skills: ${error.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
