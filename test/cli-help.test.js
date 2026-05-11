import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function runPlane(args) {
  return spawnSync(process.execPath, ["./src/cli.js", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("config help works at command and action levels", () => {
  const configHelp = runPlane(["config", "-h"]);
  assert.equal(configHelp.status, 0);
  assert.match(configHelp.stdout, /plane config set/);

  const setHelp = runPlane(["config", "set", "--help"]);
  assert.equal(setHelp.status, 0);
  assert.match(setHelp.stdout, /plane config set \[--base-url/);

  const helpCommand = runPlane(["help", "config", "set"]);
  assert.equal(helpCommand.status, 0);
  assert.match(helpCommand.stdout, /plane config set \[--base-url/);
});

test("nested action help keeps exact command context", () => {
  const cases = [
    [["project", "members", "add", "--help"], /plane project members add/],
    [["project", "features", "set", "--help"], /plane project features set/],
    [["issue", "comments", "add", "--help"], /plane issue comments add/],
    [["issue", "links", "update", "--help"], /plane issue links update/],
    [["issue", "relations", "add", "--help"], /plane issue relations add/],
    [["issue", "attachments", "upload", "--help"], /plane issue attachments upload/],
    [["issue", "todo", "--help"], /plane issue todo/],
  ];

  for (const [args, pattern] of cases) {
    const result = runPlane(args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, pattern);
  }
});

test("project delete command is not exposed", () => {
  const help = runPlane(["project", "--help"]);
  assert.equal(help.status, 0);
  assert.doesNotMatch(help.stdout, /plane project delete/);

  const result = runPlane(["project", "delete", "project-1", "--confirm"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown project subcommand: delete/);
});
