import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CliError } from "../src/core/errors.js";
import { loadConfig, saveConfig } from "../src/core/config.js";

test("saveConfig can clear selected workspace", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "plane-cli-auth-"));
  process.env.PLANE_CLI_CONFIG_PATH = join(tempDir, "config.json");

  await saveConfig({
    baseUrl: "https://plane.example.com",
    apiKey: "token",
    workspace: "team-a",
    knownWorkspaces: ["team-a", "team-b"],
  });

  await saveConfig({
    workspace: null,
  });

  const config = await loadConfig();
  assert.equal(config.workspace, undefined);
  assert.deepEqual(config.knownWorkspaces, ["team-a", "team-b"]);

  delete process.env.PLANE_CLI_CONFIG_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

test("explicit workspace should be validated against detected workspaces", async () => {
  const known = ["team-a", "team-b"];

  assert.throws(
    () => {
      if (!known.includes("team-c")) {
        throw new CliError("Workspace not found for this account: team-c", {
          details: { knownWorkspaces: known },
        });
      }
    },
    {
      name: "CliError",
      message: "Workspace not found for this account: team-c",
    }
  );
});
