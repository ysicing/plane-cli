import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig, resolveConfigPath, resolveRuntimeConfig, saveConfig } from "../src/core/config.js";

test("config save/load round trip", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-config-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane.example.com/api/v1",
    apiKey: "secret-token",
    workspace: "demo",
    knownWorkspaces: ["demo", "demo-2"],
  });

  const loaded = await loadConfig();
  assert.equal(resolveConfigPath(), join(tempDir, "config.json"));
  assert.deepEqual(loaded, {
    baseUrl: "https://plane.example.com",
    apiKey: "secret-token",
    workspace: "demo",
    knownWorkspaces: ["demo", "demo-2"],
  });

  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

test("env overrides file config", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-config-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane-a.example.com",
    apiKey: "token-a",
    workspace: "workspace-a",
    knownWorkspaces: ["workspace-a", "workspace-b"],
  });

  process.env.PLANE_BASE_URL = "https://plane-b.example.com";
  process.env.PLANE_API_KEY = "token-b";

  const config = await resolveRuntimeConfig();
  assert.deepEqual(config, {
    baseUrl: "https://plane-b.example.com",
    apiKey: "token-b",
    workspace: "workspace-a",
    knownWorkspaces: ["workspace-a", "workspace-b"],
  });

  delete process.env.PLANE_BASE_URL;
  delete process.env.PLANE_API_KEY;
  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

test("saveConfig preserves existing keys when partial update omits them", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-config-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane.example.com",
    apiKey: "token-a",
    workspace: "workspace-a",
  });

  await saveConfig({
    workspace: "ops",
  });

  const config = await loadConfig();
  assert.deepEqual(config, {
    baseUrl: "https://plane.example.com",
    apiKey: "token-a",
    workspace: "ops",
  });

  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});
