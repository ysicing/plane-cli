import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectFeaturesPayload,
  buildProjectPayload,
  normalizeProjectRole,
  parseToggle,
  splitProjectCreatePayload,
} from "../src/commands/project.js";
import {
  buildIssueCommentPayload,
  buildIssueLinkPayload,
  buildIssueLabelPayload,
  buildIssuePayload,
  buildIssueRelationPayload,
  inferAttachmentMimeType,
  parseIssueKey,
  resolveAssigneeRefs,
} from "../src/commands/issue.js";

test("buildProjectPayload keeps supported fields only", () => {
  const payload = buildProjectPayload({
    name: "Demo",
    identifier: "demo",
    description: "hello",
    "project-lead": "u1",
    "default-assignee": "u2",
  });

  assert.deepEqual(payload, {
    name: "Demo",
    identifier: "DEMO",
    description: "hello",
    project_lead: "u1",
    default_assignee: "u2",
  });
});

test("splitProjectCreatePayload separates create and post-create update fields", () => {
  assert.deepEqual(
    splitProjectCreatePayload({
      name: "Demo",
      identifier: "demo",
      description: "hello",
      "project-lead": "u1",
      "default-assignee": "u2",
    }),
    {
      createPayload: {
        name: "Demo",
        identifier: "DEMO",
      },
      postCreateUpdatePayload: {
        description: "hello",
        project_lead: "u1",
        default_assignee: "u2",
      },
    }
  );
});

test("buildIssuePayload maps csv options into arrays", () => {
  const payload = buildIssuePayload({
    name: "Issue",
    "description-html": "<p>hello</p>",
    state: "state-1",
    priority: "high",
    assignees: "u1, u2",
    labels: "l1,l2",
  });

  assert.deepEqual(payload, {
    name: "Issue",
    description_html: "<p>hello</p>",
    state: "state-1",
    priority: "high",
    assignees: ["u1", "u2"],
    labels: ["l1", "l2"],
  });
});

test("buildIssueLabelPayload keeps supported label fields only", () => {
  assert.deepEqual(
    buildIssueLabelPayload({
      name: "backend",
      color: "#ff6600",
      description: "Backend work",
      parent: "label-parent",
      "sort-order": "10",
    }),
    {
      name: "backend",
      color: "#ff6600",
      description: "Backend work",
      parent: "label-parent",
      sort_order: "10",
    }
  );
});

test("buildIssueCommentPayload maps comment html", () => {
  assert.deepEqual(
    buildIssueCommentPayload({
      html: "<p>hello</p>",
      access: "0",
    }),
    {
      comment_html: "<p>hello</p>",
      access: "0",
    }
  );
});

test("buildIssueLinkPayload maps link fields", () => {
  assert.deepEqual(
    buildIssueLinkPayload(
      {
        title: "Docs",
        url: "https://example.com/docs",
      },
      "issue-1"
    ),
    {
      title: "Docs",
      url: "https://example.com/docs",
      issue_id: "issue-1",
    }
  );
});

test("buildIssueRelationPayload maps relation fields", () => {
  assert.deepEqual(
    buildIssueRelationPayload({
      "relation-type": "blocking",
      issues: "id-1,id-2",
    }),
    {
      relation_type: "blocking",
      issues: ["id-1", "id-2"],
    }
  );
});

test("resolveAssigneeRefs resolves ids emails and names", () => {
  const members = [
    { id: "u1", email: "a@example.com", first_name: "Alice", last_name: "Doe" },
    { id: "u2", email: "b@example.com", first_name: "Bob", last_name: "Smith" },
  ];

  assert.deepEqual(resolveAssigneeRefs(["u1", "b@example.com", "Alice Doe"], members), ["u1", "u2", "u1"]);
});

test("inferAttachmentMimeType maps common extensions", () => {
  assert.equal(inferAttachmentMimeType("/tmp/demo.pdf"), "application/pdf");
  assert.equal(inferAttachmentMimeType("/tmp/demo.png"), "image/png");
  assert.equal(inferAttachmentMimeType("/tmp/demo.unknown"), null);
});

test("normalizeProjectRole maps role names to numeric values", () => {
  assert.equal(normalizeProjectRole("admin"), 20);
  assert.equal(normalizeProjectRole("member"), 15);
  assert.equal(normalizeProjectRole("guest"), 5);
});

test("parseToggle supports on off values", () => {
  assert.equal(parseToggle("on", "--epics"), true);
  assert.equal(parseToggle("off", "--epics"), false);
});

test("buildProjectFeaturesPayload maps feature switches", () => {
  assert.deepEqual(
    buildProjectFeaturesPayload({
      epics: "on",
      milestones: "off",
      "auto-transition": "true",
    }),
    {
      is_epic_enabled: true,
      is_milestone_enabled: false,
      gaeaflow_auto_transition_enabled: true,
    }
  );
});

test("parseIssueKey splits project identifier and sequence", () => {
  assert.deepEqual(parseIssueKey("DEMO-123"), {
    projectIdentifier: "DEMO",
    issueIdentifier: "123",
  });
});

test("parseIssueKey rejects invalid format", () => {
  assert.throws(
    () => parseIssueKey("bad-key"),
    {
      name: "CliError",
      message: "Issue key must look like `PROJECT-123`.",
    }
  );
});
