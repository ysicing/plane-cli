import { IssueClient } from "../api/issue-client.js";
import { UserClient } from "../api/user-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

function renderMyProjectStats(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "Project", get: (row) => row.project_identifier || "" },
    { label: "Name", get: (row) => row.project_name || "" },
    { label: "Total", get: (row) => row.total ?? "" },
    { label: "Assigned", get: (row) => row.assigned_total ?? "" },
    { label: "Pending", get: (row) => row.pending_total ?? "" },
    { label: "Completed", get: (row) => row.completed_total ?? "" },
    { label: "Overdue", get: (row) => row.overdue_total ?? "" },
  ]);
}

export function buildMyWorkItemQuery(values) {
  return pickDefined({
    per_page: values.limit,
    cursor: values.cursor,
    order_by: values["order-by"],
    fields: values.fields,
    expand: values.expand,
    project_id: values.project,
    state_group: values["state-group"],
    type_id: values["type-id"],
    issue_type_id: values["issue-type-id"],
    module_id: values["module-id"],
    cycle_id: values["cycle-id"],
    created_from: values["created-from"],
    created_to: values["created-to"],
    updated_from: values["updated-from"],
    updated_to: values["updated-to"],
    completed_from: values["completed-from"],
    completed_to: values["completed-to"],
    target_from: values["target-from"],
    target_to: values["target-to"],
  });
}

function printHelp() {
  console.log(`Usage:
  plane me
  plane me work-items [--project <project-id>] [--state-group <group>] [--type-id <type-id>] [--issue-type-id <type-id>] [--module-id <module-id>] [--cycle-id <cycle-id>] [--created-from <datetime>] [--created-to <datetime>] [--updated-from <datetime>] [--updated-to <datetime>] [--completed-from <datetime>] [--completed-to <datetime>] [--target-from <date>] [--target-to <date>] [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane me project-stats [--project <project-id>] [--state-group <group>] [--type-id <type-id>] [--issue-type-id <type-id>] [--module-id <module-id>] [--cycle-id <cycle-id>] [--created-from <datetime>] [--created-to <datetime>] [--updated-from <datetime>] [--updated-to <datetime>] [--completed-from <datetime>] [--completed-to <datetime>] [--target-from <date>] [--target-to <date>]
`);
}

function parseMyWorkItemArgs(args, includePagination) {
  const parsed = parseCommandArgs(
    args,
    {
      project: { type: "string" },
      "state-group": { type: "string" },
      "type-id": { type: "string" },
      "issue-type-id": { type: "string" },
      "module-id": { type: "string" },
      "cycle-id": { type: "string" },
      "created-from": { type: "string" },
      "created-to": { type: "string" },
      "updated-from": { type: "string" },
      "updated-to": { type: "string" },
      "completed-from": { type: "string" },
      "completed-to": { type: "string" },
      "target-from": { type: "string" },
      "target-to": { type: "string" },
      limit: { type: "string" },
      cursor: { type: "string" },
      "order-by": { type: "string" },
      fields: { type: "string" },
      expand: { type: "string" },
    },
    false
  );

  const query = buildMyWorkItemQuery(parsed.values);
  if (!includePagination) {
    delete query.per_page;
    delete query.cursor;
    delete query.order_by;
    delete query.fields;
    delete query.expand;
  }
  return query;
}

export async function runMeCommand(args, context) {
  if (args.includes("--help") || args.includes("-h") || args.includes("help")) {
    printHelp();
    return;
  }

  const config = await resolveRuntimeConfig();
  const planeClient = new PlaneClient(config);
  const [subcommand, ...rest] = args;

  if (!subcommand) {
    const userClient = new UserClient(planeClient);
    printData(await userClient.me(), context.output);
    return;
  }

  const issueClient = new IssueClient(planeClient);

  if (subcommand === "work-items") {
    const result = await issueClient.listMyWorkItems(parseMyWorkItemArgs(rest, true));
    printData(result, context.output);
    return;
  }

  if (subcommand === "project-stats") {
    const result = await issueClient.listMyProjectWorkItemStats(parseMyWorkItemArgs(rest, false));
    printData(result, {
      ...context.output,
      render: renderMyProjectStats,
    });
    return;
  }

  throw new CliError(`Unknown me subcommand: ${subcommand}`);
}
