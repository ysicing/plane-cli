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

export function buildStatePayload(values) {
  return pickDefined({
    name: values.name,
    color: values.color,
    group: values.group,
    sequence: values.sequence,
  });
}

export function buildCyclePayload(values) {
  return pickDefined({
    name: values.name,
    description: values.description,
    start_date: values["start-date"],
    end_date: values["end-date"],
    external_id: values["external-id"],
    external_source: values["external-source"],
  });
}

export function buildModulePayload(values) {
  return pickDefined({
    name: values.name,
    description: values.description,
    start_date: values["start-date"],
    target_date: values["end-date"],
    external_id: values["external-id"],
    external_source: values["external-source"],
  });
}

export function buildMilestonePayload(values) {
  return pickDefined({
    title: values.title,
    description_html: values.html,
    target_date: values["target-date"],
    external_id: values["external-id"],
    external_source: values["external-source"],
  });
}

export function buildEpicPayload(values) {
  return pickDefined({
    name: values.name,
    description_html: values.html,
    priority: values.priority,
    start_date: values["start-date"],
    target_date: values["target-date"],
    state_id: values["state-id"],
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
    true
  );
  ensureValue(parsed.values.project, "Project ID is required.");
  return parsed;
}

function printListHelp() {
  console.log(`Usage:
  plane project states ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--fields <fields>] [--expand <fields>]
  plane project states get --project <project-id> <state-id>
  plane project states create --project <project-id> --name <name> --color <hex> --group <backlog|unstarted|started|completed|cancelled|triage> [--sequence <n>]
  plane project states update --project <project-id> <state-id> [--name <name>] [--color <hex>] [--group <group>] [--sequence <n>]
  plane project states delete --project <project-id> <state-id> --confirm
  plane project cycles ls --project <project-id> [--view <all|current|upcoming|completed|draft|incomplete>] [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project cycles get --project <project-id> <cycle-id>
  plane project cycles create --project <project-id> --name <name> [--description <text>] [--start-date <date>] [--end-date <date>] [--external-id <id>] [--external-source <source>]
  plane project cycles update --project <project-id> <cycle-id> [--name <name>] [--description <text>] [--start-date <date>] [--end-date <date>] [--external-id <id>] [--external-source <source>]
  plane project cycles delete --project <project-id> <cycle-id> --confirm
  plane project cycles archived --project <project-id> [--limit <n>] [--cursor <cursor>]
  plane project cycles issues --project <project-id> --cycle <cycle-id> [--limit <n>] [--cursor <cursor>]
  plane project cycles issues delete --project <project-id> --cycle <cycle-id> <issue-id> --confirm
  plane project modules ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project modules get --project <project-id> <module-id>
  plane project modules create --project <project-id> --name <name> [--description <text>] [--start-date <date>] [--end-date <date>] [--external-id <id>] [--external-source <source>]
  plane project modules update --project <project-id> <module-id> [--name <name>] [--description <text>] [--start-date <date>] [--end-date <date>] [--external-id <id>] [--external-source <source>]
  plane project modules delete --project <project-id> <module-id> --confirm
  plane project modules archived --project <project-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project modules issues --project <project-id> --module <module-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane project modules issues delete --project <project-id> --module <module-id> <issue-id> --confirm
  plane project epics ls --project <project-id>
  plane project epics get --project <project-id> <epic-id>
  plane project epics create --project <project-id> --name <name> [--html <html>] [--priority <urgent|high|medium|low|none>] [--start-date <date>] [--target-date <date>] [--state-id <state-id>]
  plane project epics update --project <project-id> <epic-id> [--name <name>] [--html <html>] [--priority <urgent|high|medium|low|none>] [--start-date <date>] [--target-date <date>] [--state-id <state-id>]
  plane project epics delete --project <project-id> <epic-id> --confirm
  plane project epics issues --project <project-id> --epic <epic-id>
  plane project milestones ls --project <project-id> [--search <text>]
  plane project milestones get --project <project-id> <milestone-id>
  plane project milestones create --project <project-id> --title <title> [--html <html>] [--target-date <date>] [--external-id <id>] [--external-source <source>]
  plane project milestones update --project <project-id> <milestone-id> [--title <title>] [--html <html>] [--target-date <date>] [--external-id <id>] [--external-source <source>]
  plane project milestones delete --project <project-id> <milestone-id> --confirm
`);
}

async function runStatesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printListHelp();
    return;
  }
  if (subcommand === "ls") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listStates(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }
  if (subcommand === "get") {
    const parsed = parseListArgs(rest);
    ensureValue(parsed.positionals[0], "State ID is required.");
    printData(await projectClient.getState(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }
  if (subcommand === "create") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      color: { type: "string" },
      group: { type: "string" },
      sequence: { type: "string" },
    });
    ensureValue(parsed.values.name, "State name is required.");
    ensureValue(parsed.values.color, "State color is required.");
    ensureValue(parsed.values.group, "State group is required.");
    printData(await projectClient.createState(parsed.values.project, buildStatePayload(parsed.values)), context.output);
    return;
  }
  if (subcommand === "update") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      color: { type: "string" },
      group: { type: "string" },
      sequence: { type: "string" },
    });
    ensureValue(parsed.positionals[0], "State ID is required.");
    const payload = buildStatePayload(parsed.values);
    if (Object.keys(payload).length === 0) throw new CliError("At least one update field is required.");
    await projectClient.updateState(parsed.values.project, parsed.positionals[0], payload);
    printData(await projectClient.getState(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }
  if (subcommand === "delete") {
    const parsed = parseListArgs(rest, { confirm: { type: "boolean" } });
    ensureValue(parsed.positionals[0], "State ID is required.");
    if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
    await projectClient.deleteState(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }
  throw new CliError(`Unknown project states subcommand: ${subcommand}`);
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

  if (subcommand === "get") {
    const parsed = parseListArgs(rest);
    ensureValue(parsed.positionals[0], "Cycle ID is required.");
    printData(await projectClient.getCycle(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      description: { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.values.name, "Cycle name is required.");
    printData(
      await projectClient.createCycle(parsed.values.project, {
        project_id: parsed.values.project,
        ...buildCyclePayload(parsed.values),
      }),
      context.output
    );
    return;
  }

  if (subcommand === "update") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      description: { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Cycle ID is required.");
    const payload = buildCyclePayload(parsed.values);
    if (Object.keys(payload).length === 0) throw new CliError("At least one update field is required.");
    await projectClient.updateCycle(parsed.values.project, parsed.positionals[0], payload);
    printData(await projectClient.getCycle(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseListArgs(rest, { confirm: { type: "boolean" } });
    ensureValue(parsed.positionals[0], "Cycle ID is required.");
    if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
    await projectClient.deleteCycle(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }

  if (subcommand === "archived") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listArchivedCycles(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "issues") {
    const [issuesSubcommand, ...issueRest] = rest;

    if (issuesSubcommand === "delete") {
      const parsed = parseListArgs(issueRest, {
        cycle: { type: "string" },
        confirm: { type: "boolean" },
      });
      ensureValue(parsed.values.cycle, "Cycle ID is required.");
      ensureValue(parsed.positionals[0], "Issue ID is required.");
      if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
      await projectClient.deleteCycleWorkItem(parsed.values.project, parsed.values.cycle, parsed.positionals[0]);
      printData({ deleted: true, id: parsed.positionals[0] }, context.output);
      return;
    }

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

  if (subcommand === "get") {
    const parsed = parseListArgs(rest);
    ensureValue(parsed.positionals[0], "Module ID is required.");
    printData(await projectClient.getModule(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      description: { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.values.name, "Module name is required.");
    printData(await projectClient.createModule(parsed.values.project, buildModulePayload(parsed.values)), context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      description: { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Module ID is required.");
    const payload = buildModulePayload(parsed.values);
    if (Object.keys(payload).length === 0) throw new CliError("At least one update field is required.");
    await projectClient.updateModule(parsed.values.project, parsed.positionals[0], payload);
    printData(await projectClient.getModule(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseListArgs(rest, { confirm: { type: "boolean" } });
    ensureValue(parsed.positionals[0], "Module ID is required.");
    if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
    await projectClient.deleteModule(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }

  if (subcommand === "archived") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listArchivedModules(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }

  if (subcommand === "issues") {
    const [issuesSubcommand, ...issueRest] = rest;

    if (issuesSubcommand === "delete") {
      const parsed = parseListArgs(issueRest, {
        module: { type: "string" },
        confirm: { type: "boolean" },
      });
      ensureValue(parsed.values.module, "Module ID is required.");
      ensureValue(parsed.positionals[0], "Issue ID is required.");
      if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
      await projectClient.deleteModuleWorkItem(parsed.values.project, parsed.values.module, parsed.positionals[0]);
      printData({ deleted: true, id: parsed.positionals[0] }, context.output);
      return;
    }

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

  if (subcommand === "get") {
    const parsed = parseListArgs(rest);
    ensureValue(parsed.positionals[0], "Epic ID is required.");
    printData(await projectClient.getEpic(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      html: { type: "string" },
      priority: { type: "string" },
      "start-date": { type: "string" },
      "target-date": { type: "string" },
      "state-id": { type: "string" },
    });
    ensureValue(parsed.values.name, "Epic name is required.");
    printData(await projectClient.createEpic(parsed.values.project, buildEpicPayload(parsed.values)), context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseListArgs(rest, {
      name: { type: "string" },
      html: { type: "string" },
      priority: { type: "string" },
      "start-date": { type: "string" },
      "target-date": { type: "string" },
      "state-id": { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Epic ID is required.");
    const payload = buildEpicPayload(parsed.values);
    if (Object.keys(payload).length === 0) throw new CliError("At least one update field is required.");
    await projectClient.updateEpic(parsed.values.project, parsed.positionals[0], payload);
    printData(await projectClient.getEpic(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseListArgs(rest, { confirm: { type: "boolean" } });
    ensureValue(parsed.positionals[0], "Epic ID is required.");
    if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
    await projectClient.deleteEpic(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
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
  if (subcommand === "ls") {
    const parsed = parseListArgs(rest);
    const result = await projectClient.listMilestones(parsed.values.project, buildProjectListQuery(parsed.values));
    printData(result, { ...context.output, render: renderNamedRows });
    return;
  }
  if (subcommand === "get") {
    const parsed = parseListArgs(rest);
    ensureValue(parsed.positionals[0], "Milestone ID is required.");
    printData(await projectClient.getMilestone(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }
  if (subcommand === "create") {
    const parsed = parseListArgs(rest, {
      title: { type: "string" },
      html: { type: "string" },
      "target-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.values.title, "Milestone title is required.");
    printData(await projectClient.createMilestone(parsed.values.project, buildMilestonePayload(parsed.values)), context.output);
    return;
  }
  if (subcommand === "update") {
    const parsed = parseListArgs(rest, {
      title: { type: "string" },
      html: { type: "string" },
      "target-date": { type: "string" },
      "external-id": { type: "string" },
      "external-source": { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Milestone ID is required.");
    const payload = buildMilestonePayload(parsed.values);
    if (Object.keys(payload).length === 0) throw new CliError("At least one update field is required.");
    await projectClient.updateMilestone(parsed.values.project, parsed.positionals[0], payload);
    printData(await projectClient.getMilestone(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }
  if (subcommand === "delete") {
    const parsed = parseListArgs(rest, { confirm: { type: "boolean" } });
    ensureValue(parsed.positionals[0], "Milestone ID is required.");
    if (!parsed.values.confirm) throw new CliError("Deletion requires --confirm.");
    await projectClient.deleteMilestone(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }
  throw new CliError(`Unknown project milestones subcommand: ${subcommand}`);
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
