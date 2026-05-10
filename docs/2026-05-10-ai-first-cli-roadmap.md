# AI-First `plane-cli` Roadmap

## Scope

This note evaluates `plane-cli` from the perspective of an AI agent invoking the CLI as an execution layer for project management work.

The gap analysis is split into two buckets:

1. Plane already exposes the capability in the current swagger, but `plane-cli` does not wrap it yet.
2. The current swagger does not expose the capability cleanly, so Plane needs new API support before the CLI can offer a good interface.

All "missing API" statements below are based on the current schema exposed at `GET /api/schema/`.

## Current Strengths

- Stable JSON output with `--json` / `--format json`
- Auth, config, workspace selection
- Project list/get/update/create, members add/list, feature toggles
- Work item list/get/search/create/update
- Comments, links, relations, attachments
- Project planning list surfaces: states, cycles, modules, epics, milestones
- My work item views: `me work-items`, `me project-stats`, `me summary`, `me summary --all-ws`
- Work item epic/milestone set and clear

This is enough for read-heavy automation plus narrow single-item mutations.

## P0: Make the CLI Reliable for AI Invocation

These are the highest priority items. They improve machine predictability and reduce agent-side glue code.

### P0.1 Unified machine envelope

Keep `--json`, but normalize success/error shapes across commands.

Recommended shape:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "workspace_not_selected",
    "message": "Workspace is not selected.",
    "retryable": false,
    "hint": "Run `plane workspace use <slug>`."
  }
}
```

Why:

- agents should branch on `error.code`, not parse English strings
- retry decisions become explicit
- downstream wrappers become much smaller

### P0.2 Auto-pagination

Add:

- `--all`
- `--max-items <n>`
- `--page-size <n>`

Current commands mostly expose `cursor` and `per_page`. That is fine for humans, but poor for agents. Agents should not have to implement cursor loops for every list command.

### P0.3 Entity resolution

Agents should not have to resolve UUIDs manually before every mutation.

Recommended commands:

- `plane project resolve <identifier|name>`
- `plane issue resolve <key|title>`
- `plane project state resolve --project <id> <name|group>`
- `plane project cycle resolve --project <id> <name>`
- `plane project module resolve --project <id> <name>`
- `plane project epic resolve --project <id> <name>`
- `plane project milestone resolve --project <id> <title>`

Implementation note:

- this can be implemented in the CLI first by calling existing list/search APIs and filtering client-side
- it does not strictly require new Plane APIs

### P0.4 Dry-run

High-value for agents, especially before bulk operations.

Recommended support:

- `issue update --dry-run`
- `issue bulk update --dry-run`
- `project features set --dry-run`
- `issue epic set --dry-run`
- `issue milestone set --dry-run`

Even when the server has no dry-run API, the CLI can still echo:

- resolved targets
- normalized payload
- expected API call

### P0.5 Idempotent create helpers

Agents often rerun workflows. Idempotent helpers reduce duplicate data.

Recommended:

- `label ensure`
- `milestone ensure`
- `cycle ensure`
- `module ensure`
- `epic ensure`
- `comment add --dedupe-key`

Implementation note:

- most of these can be implemented with list/search + conditional create in the CLI
- they do not require new Plane APIs, but server-side uniqueness helpers would still be better

## P1: Close the Business Coverage Gap

These make the CLI useful for actual project operations rather than only inspection.

## P1.1 Plane has API, CLI is missing wrappers

Verified in current swagger.

### Workspace-level

- Invitations:
  - `workspaces_invitations_list`
  - `workspaces_invitations_create`
  - `workspaces_invitations_retrieve`
  - `workspaces_invitations_partial_update`
  - `workspaces_invitations_destroy`
- Stickies:
  - `list_stickies`
  - `create_sticky`
  - `update_sticky`
  - `delete_sticky`

### Intake queue

- `get_intake_work_items_list`
- `create_intake_work_item`
- `retrieve_intake_work_item`
- `update_intake_work_item`
- `delete_intake_work_item`

### Planning object CRUD

- Cycles:
  - `create_cycle`
  - `retrieve_cycle`
  - `update_cycle`
  - `delete_cycle`
- Modules:
  - `create_module`
  - `retrieve_module`
  - `update_module`
  - `delete_module`
- Epics:
  - `create_project_epic`
  - `retrieve_project_epic`
  - `update_project_epic`
  - `delete_project_epic`
- Milestones:
  - `create_project_milestone`
  - `retrieve_project_milestone`
  - `update_project_milestone`
  - `delete_project_milestone`
- States:
  - `create_state`
  - `retrieve_state`
  - `update_state`
  - `delete_state`

### Relationship and membership management

- Remove work item from cycle:
  - `delete_cycle_work_item`
- Remove work item from module:
  - `delete_module_work_item`
- Project member update/delete:
  - `update_project_member`
  - `delete_project_member`
  - duplicated legacy variants also exist

### Work item destructive maintenance

- `delete_work_item`
- `delete_work_item_comment`
- `delete_work_item_attachment`
- `delete_work_item_link`
- `update_label`
- `delete_label`

These should not necessarily be exposed as default commands without guardrails, but AI-grade CLI support should exist with confirmation controls.

## P1.2 Existing Plane APIs that deserve better CLI semantics

The raw API exists, but the CLI should expose higher-level commands.

- Add/remove issue to cycle
- Add/remove issue to module
- Add/remove issue to epic
- Add/remove issue to milestone
- Archive/unarchive cycle/module/project where applicable

The current schema exposes parts of this, but the current CLI surface is still too low-level and uneven for agent workflows.

## P2: Add AI-Level Task Semantics

These are not just wrappers. They are commands that map to real project-management jobs.

- `issue bulk update`
- `issue bulk assign`
- `issue bulk set-state`
- `issue bulk add-label`
- `issue bulk set-cycle`
- `issue bulk set-module`
- `issue bulk set-milestone`
- `issue bulk set-epic`
- `triage intake`
- `prepare standup`
- `weekly summary`
- `project health`
- `rebalance workload`

Most of these would still use existing lower-level APIs underneath, but they reduce planning effort for the agent.

## Plane API Gaps

The items below are not cleanly exposed in the current swagger and would benefit from new Plane endpoints rather than CLI-only workarounds.

## Gap 1: Bulk mutation APIs

Not found in current schema:

- bulk update work items
- bulk assign assignees
- bulk add/remove labels
- bulk move state
- bulk set cycle/module/milestone/epic

Why it matters:

- AI workflows usually operate on sets, not single items
- client-side loops are possible, but they are slow, harder to retry, and leave partial-failure states

Recommended Plane APIs:

- `POST /work-items/bulk-update`
- `POST /work-items/bulk-assign`
- `POST /work-items/bulk-labels`
- `POST /work-items/bulk-relocate`

## Gap 2: Cross-workspace "my work" API

Current schema provides:

- `GET /workspaces/{slug}/me/work-items/`
- `GET /workspaces/{slug}/me/projects/work-items/`

Missing:

- one call for all accessible workspaces

Why it matters:

- `--all-ws` currently requires the CLI to loop through `knownWorkspaces`
- this is acceptable for now, but not ideal for latency or consistency

Recommended Plane API:

- `GET /me/work-items/`
- `GET /me/projects/work-items/`

## Gap 3: Structured reporting endpoints

Current schema has project summary plus several list endpoints, but no dedicated agent-friendly report endpoints for:

- standup summary
- weekly summary
- workload summary by assignee
- overdue summary
- stale work item summary

The CLI can synthesize some of this client-side, but a server-side report surface would be more stable and cheaper for agents.

## Gap 4: Resolve-by-name endpoints

Current schema supports:

- issue by `PROJECT-123`
- workspace/project-scoped work item search

But it does not provide clean resolve endpoints for:

- project by identifier
- cycle by name
- module by name
- milestone by title
- epic by name
- state by group/name

The CLI can emulate this using list/search + filter, but direct resolve endpoints would improve reliability and lower round trips.

Recommended Plane APIs:

- `GET /workspaces/{slug}/projects:resolve?identifier=...`
- `GET /workspaces/{slug}/projects/{project_id}/states:resolve?...`
- similar resolve endpoints for cycle/module/epic/milestone

## Gap 5: Server-side dry-run / validation endpoints

No dry-run or validation preview endpoints are visible in current swagger.

Why it matters:

- AI workflows benefit from safe preview before mutation
- client-side dry-run can only show intent, not server validation result

Recommended Plane APIs:

- `POST ...:validate`
- `POST ...:preview`

## Recommended Delivery Order

### Phase 1

- JSON envelope normalization
- `--all` auto-pagination
- entity resolve helpers
- `summary` / `search` cross-workspace support

### Phase 2

- CLI wrappers for existing invitation, sticky, intake, and planning CRUD APIs
- safe destructive commands with `--confirm`
- idempotent `ensure-*` helpers

### Phase 3

- bulk mutation commands
- standup / weekly / health / workload summaries
- push for missing Plane bulk/report/resolve APIs

## Shortlist: Best Next 5 Features

If only five things should be built next:

1. `issue bulk update`
2. `--all` auto-pagination on list/search commands
3. `resolve` helpers for project/state/cycle/module/milestone/epic
4. invitations + intake + stickies command coverage
5. stable machine error codes and dry-run

This set would move the CLI from "API wrapper" closer to "AI execution surface".
