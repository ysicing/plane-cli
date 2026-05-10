import { ProjectClient } from "../api/project-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { ensureValue, parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

export function buildIntakeIssueCreatePayload(values) {
  return {
    issue: pickDefined({
      name: values.name,
      description: values.description,
      priority: values.priority,
    }),
  };
}

export function buildIntakeIssueUpdatePayload(values) {
  const issue = pickDefined({
    name: values.name,
    description: values.description,
    priority: values.priority,
  });

  return pickDefined({
    status: values.status,
    snoozed_till: values["snoozed-till"],
    duplicate_to: values["duplicate-to"],
    source: values.source,
    source_email: values["source-email"],
    issue: Object.keys(issue).length > 0 ? issue : undefined,
  });
}

function hasHelpFlag(args) {
  return args.includes("--help") || args.includes("-h") || args.includes("help");
}

function renderIntakeIssues(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Status", get: (row) => row.status ?? "" },
    { label: "Source", get: (row) => row.source || "" },
    { label: "Issue", get: (row) => row.issue?.name || "" },
  ]);
}

export function printProjectIntakeHelp() {
  console.log(`Usage:
  plane project intake ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--fields <fields>] [--expand <fields>]
  plane project intake get --project <project-id> <issue-id>
  plane project intake create --project <project-id> --name <name> [--description <text>] [--priority <urgent|high|medium|low|none>]
  plane project intake update --project <project-id> <issue-id> [--status <n>] [--snoozed-till <datetime>] [--duplicate-to <issue-id>] [--source <text>] [--source-email <email>] [--name <name>] [--description <text>] [--priority <urgent|high|medium|low|none>]
  plane project intake delete --project <project-id> <issue-id> --confirm
`);
}

export async function runProjectIntakeCommand(args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help" || hasHelpFlag(rest)) {
    printProjectIntakeHelp();
    return;
  }

  const config = await resolveRuntimeConfig();
  const projectClient = new ProjectClient(new PlaneClient(config));

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        limit: { type: "string" },
        cursor: { type: "string" },
        fields: { type: "string" },
        expand: { type: "string" },
      },
      false
    );
    ensureValue(parsed.values.project, "Project ID is required.");
    const result = await projectClient.listIntakeIssues(
      parsed.values.project,
      pickDefined({
        per_page: parsed.values.limit,
        cursor: parsed.values.cursor,
        fields: parsed.values.fields,
        expand: parsed.values.expand,
      })
    );
    printData(result, { ...context.output, render: renderIntakeIssues });
    return;
  }

  if (subcommand === "get") {
    const parsed = parseCommandArgs(rest, { project: { type: "string" } });
    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.positionals[0], "Issue ID is required.");
    printData(await projectClient.getIntakeIssue(parsed.values.project, parsed.positionals[0]), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        priority: { type: "string" },
      },
      false
    );
    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.values.name, "Issue name is required.");
    printData(
      await projectClient.createIntakeIssue(parsed.values.project, buildIntakeIssueCreatePayload(parsed.values)),
      context.output
    );
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        status: { type: "string" },
        "snoozed-till": { type: "string" },
        "duplicate-to": { type: "string" },
        source: { type: "string" },
        "source-email": { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        priority: { type: "string" },
      }
    );
    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const payload = buildIntakeIssueUpdatePayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one update field is required.");
    }
    printData(await projectClient.updateIntakeIssue(parsed.values.project, parsed.positionals[0], payload), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseCommandArgs(rest, {
      project: { type: "string" },
      confirm: { type: "boolean" },
    });
    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.positionals[0], "Issue ID is required.");
    if (!parsed.values.confirm) {
      throw new CliError("Deletion requires --confirm.");
    }
    await projectClient.deleteIntakeIssue(parsed.values.project, parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }

  throw new CliError(`Unknown project intake subcommand: ${subcommand}`);
}
