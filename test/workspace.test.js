import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig, saveConfig } from "../src/core/config.js";
import { runWorkspaceCommand } from "../src/commands/workspace.js";
import { PlaneClient } from "../src/core/http.js";
import { CliError } from "../src/core/errors.js";

test("workspace use updates current workspace from known list", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-workspace-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane.example.com",
    apiKey: "token",
    knownWorkspaces: ["team-a", "team-b"],
  });

  await runWorkspaceCommand(["use", "team-b"], {
    output: {
      json: false,
      render() {},
    },
  });

  const config = await loadConfig();
  assert.equal(config.workspace, "team-b");
  assert.deepEqual(config.knownWorkspaces, ["team-a", "team-b"]);

  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

test("workspace current returns current workspace and known list", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-workspace-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane.example.com",
    apiKey: "token",
    workspace: "team-a",
    knownWorkspaces: ["team-a", "team-b"],
  });

  let result;
  await runWorkspaceCommand(["current"], {
    output: {
      json: false,
      render(data) {
        result = data;
      },
    },
  });

  assert.deepEqual(result, {
    workspace: "team-a",
    knownWorkspaces: ["team-a", "team-b"],
  });

  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

test("plane client gives actionable error when workspace is missing", () => {
  const client = new PlaneClient({
    baseUrl: "https://plane.example.com",
    apiKey: "token",
    knownWorkspaces: ["team-a", "team-b"],
  });

  assert.throws(
    () => client.workspacePath("/projects/"),
    (error) =>
      error instanceof CliError &&
      error.message.includes("Workspace is not selected") &&
      error.details?.knownWorkspaces?.length === 2
  );
});
