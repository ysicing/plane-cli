import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectFeaturesPayload,
  buildProjectPayload,
  normalizeProjectRole,
  parseToggle,
  splitProjectCreatePayload,
} from "../src/commands/project.js";
import { buildIntakeIssueCreatePayload, buildIntakeIssueUpdatePayload } from "../src/commands/project-intake.js";
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
import { buildStickyPayload, buildWorkspaceInvitationPayload, normalizeWorkspaceRole } from "../src/commands/workspace-resources.js";
import { aggregateWorkspaceSummaries, buildMeSummary, buildMyWorkItemQuery, isTodoWorkItem } from "../src/commands/me.js";

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

test("buildWorkspaceInvitationPayload maps invite fields", () => {
  assert.deepEqual(
    buildWorkspaceInvitationPayload({
      email: "user@example.com",
      role: "member",
    }),
    {
      email: "user@example.com",
      role: 15,
    }
  );
});

test("buildStickyPayload keeps supported sticky fields", () => {
  assert.deepEqual(
    buildStickyPayload({
      name: "sticky",
      html: "<p>note</p>",
      color: "#fff",
      "background-color": "#000",
      "sort-order": "10",
    }),
    {
      name: "sticky",
      description_html: "<p>note</p>",
      color: "#fff",
      background_color: "#000",
      sort_order: "10",
    }
  );
});

test("buildIntakeIssueCreatePayload nests issue fields", () => {
  assert.deepEqual(
    buildIntakeIssueCreatePayload({
      name: "new intake",
      description: "desc",
      priority: "high",
    }),
    {
      issue: {
        name: "new intake",
        description: "desc",
        priority: "high",
      },
    }
  );
});

test("buildIntakeIssueUpdatePayload maps intake and nested issue fields", () => {
  assert.deepEqual(
    buildIntakeIssueUpdatePayload({
      status: "1",
      "snoozed-till": "2026-05-11T10:00:00+08:00",
      "duplicate-to": "issue-2",
      source: "email",
      "source-email": "bot@example.com",
      name: "updated",
      description: "updated desc",
      priority: "low",
    }),
    {
      status: "1",
      snoozed_till: "2026-05-11T10:00:00+08:00",
      duplicate_to: "issue-2",
      source: "email",
      source_email: "bot@example.com",
      issue: {
        name: "updated",
        description: "updated desc",
        priority: "low",
      },
    }
  );
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

test("splitProjectCreatePayload keeps project view toggles in post-create update", () => {
  assert.deepEqual(
    splitProjectCreatePayload({
      name: "Demo",
      identifier: "demo",
      "cycle-view": "on",
      "module-view": "off",
      "intake-view": "true",
    }),
    {
      createPayload: {
        name: "Demo",
        identifier: "DEMO",
      },
      postCreateUpdatePayload: {
        cycle_view: true,
        module_view: false,
        intake_view: true,
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

test("isTodoWorkItem treats incomplete assigned work as todo", () => {
  assert.equal(isTodoWorkItem({ completed_at: null, state_group: "started" }), true);
  assert.equal(isTodoWorkItem({ completed_at: "2026-05-11T10:00:00+08:00", state_group: "completed" }), false);
  assert.equal(isTodoWorkItem({ completed_at: null, state: { group: "cancelled" } }), false);
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

test("buildMeSummary aggregates my items and accessible stats", () => {
  const summary = buildMeSummary(
    [
      {
        id: "i1",
        priority: "high",
        state: "todo",
        updated_at: "2026-05-10T08:00:00+08:00",
        completed_at: null,
      },
      {
        id: "i2",
        priority: "low",
        state: "done",
        updated_at: "2026-05-06T08:00:00+08:00",
        completed_at: "2026-05-07T09:00:00+08:00",
      },
      {
        id: "i3",
        priority: "low",
        state: "todo",
        updated_at: "2026-05-01T08:00:00+08:00",
        completed_at: null,
      },
    ],
    [
      {
        project_identifier: "DEMO",
        project_name: "demo",
        total: 3,
        assigned_total: 2,
        pending_total: 2,
        completed_total: 1,
        cancelled_total: 0,
        overdue_total: 1,
      },
    ],
    new Date("2026-05-10T20:00:00+08:00")
  );

  assert.equal(summary.my_work_items.all, 3);
  assert.equal(summary.my_work_items.updated_today, 1);
  assert.equal(summary.my_work_items.updated_this_week, 2);
  assert.equal(summary.my_work_items.completed_this_week, 1);
  assert.deepEqual(summary.my_work_items.by_priority, { high: 1, low: 2 });
  assert.equal(summary.accessible_work_items.project_count, 1);
  assert.equal(summary.accessible_work_items.totals.total, 3);
  assert.equal(summary.accessible_work_items.totals.assigned_total, 2);
  assert.equal(summary.accessible_work_items.totals.overdue_total, 1);
});

test("aggregateWorkspaceSummaries combines per-workspace totals", () => {
  const aggregate = aggregateWorkspaceSummaries(
    [
      {
        workspace: "demo",
        summary: {
          my_work_items: {
            all: 2,
            updated_today: 1,
            updated_this_week: 2,
            completed_this_week: 1,
            by_priority: { high: 1, low: 1 },
            by_state: { todo: 1, done: 1 },
          },
          accessible_work_items: {
            project_count: 1,
            totals: {
              total: 4,
              assigned_total: 2,
              pending_total: 2,
              completed_total: 1,
              cancelled_total: 0,
              overdue_total: 0,
            },
            projects: [{ project_identifier: "D1" }],
          },
        },
      },
      {
        workspace: "demo2",
        summary: {
          my_work_items: {
            all: 1,
            updated_today: 1,
            updated_this_week: 1,
            completed_this_week: 0,
            by_priority: { medium: 1 },
            by_state: { started: 1 },
          },
          accessible_work_items: {
            project_count: 2,
            totals: {
              total: 8,
              assigned_total: 1,
              pending_total: 6,
              completed_total: 2,
              cancelled_total: 0,
              overdue_total: 1,
            },
            projects: [{ project_identifier: "D2" }, { project_identifier: "D3" }],
          },
        },
      },
    ],
    new Date("2026-05-10T20:00:00+08:00")
  );

  assert.equal(aggregate.workspace_count, 2);
  assert.equal(aggregate.my_work_items.all, 3);
  assert.equal(aggregate.my_work_items.updated_today, 2);
  assert.equal(aggregate.my_work_items.completed_this_week, 1);
  assert.deepEqual(aggregate.my_work_items.by_priority, { high: 1, low: 1, medium: 1 });
  assert.equal(aggregate.accessible_work_items.project_count, 3);
  assert.equal(aggregate.accessible_work_items.totals.total, 12);
  assert.equal(aggregate.accessible_work_items.totals.assigned_total, 3);
  assert.equal(aggregate.accessible_work_items.projects.length, 3);
  assert.equal(aggregate.accessible_work_items.projects[0].workspace, "demo");
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

test("normalizeWorkspaceRole maps role names to numeric values", () => {
  assert.equal(normalizeWorkspaceRole("admin"), 20);
  assert.equal(normalizeWorkspaceRole("member"), 15);
  assert.equal(normalizeWorkspaceRole("guest"), 5);
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
