import { CliError } from "../core/errors.js";
import { ensureValue, parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

function rowsFrom(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function renderNamedRows(data) {
  printTable(rowsFrom(data), [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Name", get: (row) => row.name || row.title || "" },
    { label: "Status", get: (row) => row.status || row.group || "" },
    { label: "Created", get: (row) => row.created_at || "" },
  ]);
}

function renderWorkItemRows(data) {
  printTable(rowsFrom(data), [
    { label: "ID", get: (row) => row.issue?.id || row.id || "" },
    { label: "Seq", get: (row) => row.issue?.sequence_id || row.sequence_id || "" },
    { label: "Name", get: (row) => row.issue?.name || row.name || "" },
    { label: "Priority", get: (row) => row.issue?.priority || row.priority || "" },
    { label: "State", get: (row) => row.issue?.state || row.state || row.state_id || "" },
  ]);
}

export function buildProjectListQuery(values) {
  return pickDefined({
    per_page: values.limit,
    cursor: values.cursor,
    order_by: values["order-by"],
    fields: values.fields,
    expand: values.expand,
    cycle_view: values.view,
    search: values.search,
  });
}

function parseListArgs(args, extraOptions = {}) {
  const parsed = parseCommandArgs(
    args,
    {
      project: { type: "string" },
      limit: { type: "string" },
      cursor: { type: "string" },
      "order-by": { type: "string" },
      fields: { type: "string" },
      expand: { type: "string" },
      view: { type: "string" },
      search: { type: "string" },
      ...extraOptions,
    },
    false
  );
  ensureValue(parsed.values.project, "Project ID is required.");
  return parsed;
}

function printListHelp() {
  console.log(`Usage:
  plane project states ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--fields <fields>] [--expand <fields>]
  plane project cycles ls --project <project-id> [--view <all|current|upcoming|completed|draft|incomplete>] [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project cycles archived --project <project-id> [--limit <n>] [--cursor <cursor>]
  plane project cycles issues --project <project-id> --cycle <cycle-id> [--limit <n>] [--cursor <cursor>]
  plane project modules ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project modules archived --project <project-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project modules issues --project <project-id> --module <module-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project epics ls --project <project-id>
  plane project epics issues --project <project-id> --epic <epic-id>
  plane project milestones ls --project <project-id> [--search <text>]
`);
}

async function runStatesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }
  if (subcommand !== "ls") throw new CliError(`Unknown project states subcommand: ${subcommand}`);
  const parsed = parseListArgs(rest);
  const result = await projectClient.listStates(parsed.values.project, buildProjectListQuery(parsed.values));
  printData(result, { ...context.output, render: renderNamedRows });
}

async function runCyclesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listCycles(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "archived") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listArchivedCycles(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "issues") {
    const parsed = parseListArgs(rest, { cycle: { type: "string" } });
    ensureValue(parsed.values.cycle, "Cycle ID is required.");
    const result = await projectClient.listCycleWorkItems(
      parsed.values.project,
      parsed.values.cycle,
      buildProjectListQuery(parsed.values)
    );
    printData(result, { ...context.output, render: renderWorkItemRows });
    return;
  }

  throw new CliError(`Unknown project cycles subcommand: ${subcommand}`);
}

async function runModulesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listModules(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "archived") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listArchivedModules(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "issues") {
    const parsed = parseListArgs(rest, { module: { type: "string" } });
    ensureValue(parsed.values.module, "Module ID is required.");
    const result = await projectClient.listModuleWorkItems(
      parsed.values.project,
      parsed.values.module,
      buildProjectListQuery(parsed.values)
    );
    printData(result, { ...context.output, render: renderWorkItemRows });
    return;
  }

  throw new CliError(`Unknown project modules subcommand: ${subcommand}`);
}

async function runEpicsCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listEpics(parsed.values.project);
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "issues") {
    const parsed = parseListArgs(rest, { epic: { type: "string" } });
    ensureValue(parsed.values.epic, "Epic ID is required.");
    const result = await projectClient.listEpicWorkItems(parsed.values.project, parsed.values.epic);
    printData(result, { ...context.output, render: renderWorkItemRows });
    return;
  }

  throw new CliError(`Unknown project epics subcommand: ${subcommand}`);
}

async function runMilestonesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }
  if (subcommand !== "ls") throw new CliError(`Unknown project milestones subcommand: ${subcommand}`);
  const parsed = parseListArgs(rest);
  const result = await projectClient.listMilestones(parsed.values.project, buildProjectListQuery(parsed.values));
  printData(result, { ...context.output, render: renderNamedRows });
}

export async function runProjectListCommand(projectClient, subcommand, args, context) {
  if (subcommand === "states") return runStatesCommand(projectClient, args, context);
  if (subcommand === "cycles") return runCyclesCommand(projectClient, args, context);
  if (subcommand === "modules") return runModulesCommand(projectClient, args, context);
  if (subcommand === "epics") return runEpicsCommand(projectClient, args, context);
  if (subcommand === "milestones") return runMilestonesCommand(projectClient, args, context);
  throw new CliError(`Unknown project list subcommand: ${subcommand}`);
}

export function printProjectListHelp() {
  printListHelp();
}
