import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectFeaturesPayload,
  buildProjectPayload,
  normalizeProjectRole,
  parseToggle,
  splitProjectCreatePayload,
} from "../src/commands/project.js";
import { buildProjectListQuery } from "../src/commands/project-lists.js";
import {
  buildIssueCommentPayload,
  buildIssueEpicPayload,
  buildIssueLinkPayload,
  buildIssueLabelPayload,
  buildIssueMilestonePayload,
  buildIssuePayload,
  buildIssueRelationPayload,
  inferAttachmentMimeType,
  parseIssueKey,
  resolveAssigneeRefs,
} from "../src/commands/issue.js";
import { buildMyWorkItemQuery } from "../src/commands/me.js";

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

test("buildIssueEpicPayload maps set and clear payloads", () => {
  assert.deepEqual(buildIssueEpicPayload({ "epic-id": "epic-1" }), {
    epic_id: "epic-1",
  });
  assert.deepEqual(buildIssueEpicPayload({}), {
    epic_id: null,
  });
});

test("buildIssueMilestonePayload maps set and clear payloads", () => {
  assert.deepEqual(buildIssueMilestonePayload({ "milestone-id": "milestone-1" }), {
    milestone_id: "milestone-1",
  });
  assert.deepEqual(buildIssueMilestonePayload({}), {
    milestone_id: null,
  });
});

test("buildMyWorkItemQuery maps CLI filters to API query names", () => {
  assert.deepEqual(
    buildMyWorkItemQuery({
      project: "project-1",
      "state-group": "started",
      "type-id": "type-1",
      "issue-type-id": "issue-type-1",
      "module-id": "module-1",
      "cycle-id": "cycle-1",
      "created-from": "2026-05-01",
      "updated-to": "2026-05-10",
      "target-from": "2026-05-09",
      limit: "50",
      cursor: "20:1:0",
      "order-by": "-updated_at",
      fields: "id,name",
      expand: "state,labels",
    }),
    {
      per_page: "50",
      cursor: "20:1:0",
      order_by: "-updated_at",
      fields: "id,name",
      expand: "state,labels",
      project_id: "project-1",
      state_group: "started",
      type_id: "type-1",
      issue_type_id: "issue-type-1",
      module_id: "module-1",
      cycle_id: "cycle-1",
      created_from: "2026-05-01",
      updated_to: "2026-05-10",
      target_from: "2026-05-09",
    }
  );
});

test("buildProjectListQuery maps pagination and resource filters", () => {
  assert.deepEqual(
    buildProjectListQuery({
      limit: "50",
      cursor: "20:1:0",
      "order-by": "-created_at",
      fields: "id,name",
      expand: "state,labels",
      view: "current",
      search: "release",
    }),
    {
      per_page: "50",
      cursor: "20:1:0",
      order_by: "-created_at",
      fields: "id,name",
      expand: "state,labels",
      cycle_view: "current",
      search: "release",
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
