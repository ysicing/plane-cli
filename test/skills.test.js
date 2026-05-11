import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { installBundledSkills } from "../scripts/install-skills.js";

test("installBundledSkills copies packaged skills into Codex skill directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "plane-cli-skills-"));
  const targetRoot = join(root, "skills");

  const result = await installBundledSkills({
    targetRoot,
  });

  assert.ok(result.installed.includes("plane"));

  const skillPath = join(targetRoot, "plane", "SKILL.md");
  const content = await readFile(skillPath, "utf8");
  assert.ok(content.includes("name: plane"));
  assert.ok(content.includes("plane issue get GAEA-30"));
  assert.ok(content.includes("plane issue todo --json"));
  assert.ok(content.includes("plane config set --workspace <slug>"));
  assert.ok(content.includes("不提供 project/workspace 删除命令"));

  await rm(root, { recursive: true, force: true });
});
