import { ProjectClient } from "../api/project-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { ensureValue, parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

function hasHelpFlag(args) {
  return args.includes("--help") || args.includes("-h") || args.includes("help");
}

function createProjectRender(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id },
    { label: "Identifier", get: (row) => row.identifier },
    { label: "Name", get: (row) => row.name },
    { label: "Lead", get: (row) => row.project_lead || "" },
    { label: "Archived", get: (row) => (row.archived_at ? "yes" : "no") },
  ]);
}

const PROJECT_FEATURE_FIELDS = {
  "issue-types": "is_issue_type_enabled",
  epics: "is_epic_enabled",
  milestones: "is_milestone_enabled",
  "time-tracking": "is_time_tracking_enabled",
  "auto-transition": "gaeaflow_auto_transition_enabled",
  "auto-assign": "gaeaflow_auto_assign_enabled",
  "auto-worklog": "gaeaflow_auto_worklog_enabled",
  "require-worklog-before-completion": "require_worklog_before_completion_enabled",
};

const PROJECT_ROLE_MAP = {
  admin: 20,
  member: 15,
  guest: 5,
};

export function buildProjectPayload(values) {
  return pickDefined({
    name: values.name,
    identifier: values.identifier ? values.identifier.toUpperCase() : undefined,
    description: values.description,
    project_lead: values["project-lead"],
    default_assignee: values["default-assignee"],
  });
}

export function splitProjectCreatePayload(values) {
  const fullPayload = buildProjectPayload(values);
  const createPayload = pickDefined({
    name: fullPayload.name,
    identifier: fullPayload.identifier,
  });
  const postCreateUpdatePayload = pickDefined({
    description: fullPayload.description,
    project_lead: fullPayload.project_lead,
    default_assignee: fullPayload.default_assignee,
  });

  return { createPayload, postCreateUpdatePayload };
}

export function normalizeProjectRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const role = PROJECT_ROLE_MAP[normalized];
  if (!role) {
    throw new CliError("Role must be one of: admin, member, guest.");
  }
  return role;
}

export function parseToggle(value, optionName) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["on", "true", "1", "yes", "enable", "enabled"].includes(normalized)) return true;
  if (["off", "false", "0", "no", "disable", "disabled"].includes(normalized)) return false;
  throw new CliError(`Invalid value for ${optionName}: ${value}. Use on/off.`);
}

export function buildProjectFeaturesPayload(values) {
  const payload = {};

  for (const [option, field] of Object.entries(PROJECT_FEATURE_FIELDS)) {
    if (values[option] !== undefined) {
      payload[field] = parseToggle(values[option], `--${option}`);
    }
  }

  return payload;
}

function pickProjectFeatures(project) {
  return Object.fromEntries(Object.entries(PROJECT_FEATURE_FIELDS).map(([option, field]) => [field, project[field]]));
}

function renderProjectMembers(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "User ID", get: (row) => row.id || "" },
    { label: "Email", get: (row) => row.email || "" },
    { label: "Name", get: (row) => `${row.first_name || ""} ${row.last_name || ""}`.trim() },
  ]);
}

function renderWorkspaceMembers(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "User ID", get: (row) => row.id || "" },
    { label: "Email", get: (row) => row.email || "" },
    { label: "Name", get: (row) => `${row.first_name || ""} ${row.last_name || ""}`.trim() },
    { label: "Role", get: (row) => row.role ?? "" },
  ]);
}

function printHelp() {
  console.log(`Usage:
  plane project ls [--limit <n>] [--cursor <cursor>] [--order-by <field>]
  plane project get <project-id>
  plane project summary <project-id> [--fields <members,states,labels,cycles,modules,issues,intakes,pages>]
  plane project members ls --project <project-id>
  plane project members workspace
  plane project members add --project <project-id> --member <user-id> --role <admin|member|guest>
  plane project features get <project-id>
  plane project features set <project-id> [--issue-types on|off] [--epics on|off] [--milestones on|off] [--time-tracking on|off] [--auto-transition on|off] [--auto-assign on|off] [--auto-worklog on|off] [--require-worklog-before-completion on|off]
  plane project features enable-all <project-id>
  plane project create --name <name> --identifier <identifier> [--description <text>] [--project-lead <user-id>] [--default-assignee <user-id>]
  plane project update <project-id> [--name <name>] [--identifier <identifier>] [--description <text>] [--project-lead <user-id>] [--default-assignee <user-id>]
`);
}

function printProjectMembersHelp() {
  console.log(`Usage:
  plane project members ls --project <project-id>
  plane project members workspace
  plane project members add --project <project-id> --member <user-id> --role <admin|member|guest>
`);
}

function printProjectMembersAddHelp() {
  console.log(`Usage:
  plane project members add --project <project-id> --member <user-id> --role <admin|member|guest>
`);
}

function printProjectFeaturesHelp() {
  console.log(`Usage:
  plane project features get <project-id>
  plane project features set <project-id> [--issue-types on|off] [--epics on|off] [--milestones on|off] [--time-tracking on|off] [--auto-transition on|off] [--auto-assign on|off] [--auto-worklog on|off] [--require-worklog-before-completion on|off]
  plane project features enable-all <project-id>
`);
}

function printProjectFeaturesSetHelp() {
  console.log(`Usage:
  plane project features set <project-id> [--issue-types on|off] [--epics on|off] [--milestones on|off] [--time-tracking on|off] [--auto-transition on|off] [--auto-assign on|off] [--auto-worklog on|off] [--require-worklog-before-completion on|off]
`);
}

function printProjectCreateHelp() {
  console.log(`Usage:
  plane project create --name <name> --identifier <identifier> [--description <text>] [--project-lead <user-id>] [--default-assignee <user-id>]
`);
}

function printProjectUpdateHelp() {
  console.log(`Usage:
  plane project update <project-id> [--name <name>] [--identifier <identifier>] [--description <text>] [--project-lead <user-id>] [--default-assignee <user-id>]
`);
}

async function runProjectMembersCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (hasHelpFlag(rest)) {
    if (subcommand === "add") {
      printProjectMembersAddHelp();
      return;
    }
    printProjectMembersHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    const result = await projectClient.listMembers(parsed.values.project);
    printData(result, {
      ...context.output,
      render: renderProjectMembers,
    });
    return;
  }

  if (subcommand === "workspace") {
    const result = await projectClient.listWorkspaceMembers();
    printData(result, {
      ...context.output,
      render: renderWorkspaceMembers,
    });
    return;
  }

  if (subcommand === "add") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        member: { type: "string" },
        role: { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.values.member, "Member user ID is required.");
    ensureValue(parsed.values.role, "Role is required.");

    const result = await projectClient.addMember(parsed.values.project, {
      member: parsed.values.member,
      role: normalizeProjectRole(parsed.values.role),
    });
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown project members subcommand: ${subcommand}`);
}

async function runProjectFeaturesCommand(projectClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (hasHelpFlag(rest)) {
    if (subcommand === "set") {
      printProjectFeaturesSetHelp();
      return;
    }
    printProjectFeaturesHelp();
    return;
  }

  if (subcommand === "get") {
    const [projectId] = rest;
    ensureValue(projectId, "Project ID is required.");
    const project = await projectClient.get(projectId);
    printData(
      {
        id: project.id,
        identifier: project.identifier,
        name: project.name,
        ...pickProjectFeatures(project),
      },
      context.output
    );
    return;
  }

  if (subcommand === "enable-all") {
    const [projectId] = rest;
    ensureValue(projectId, "Project ID is required.");
    const payload = Object.fromEntries(Object.values(PROJECT_FEATURE_FIELDS).map((field) => [field, true]));
    const result = await projectClient.update(projectId, payload);
    printData(
      {
        id: result.id,
        identifier: result.identifier,
        name: result.name,
        ...pickProjectFeatures(result),
      },
      context.output
    );
    return;
  }

  if (subcommand === "set") {
    const [projectId, ...optionArgs] = rest;
    ensureValue(projectId, "Project ID is required.");

    const parsed = parseCommandArgs(
      optionArgs,
      {
        "issue-types": { type: "string" },
        epics: { type: "string" },
        milestones: { type: "string" },
        "time-tracking": { type: "string" },
        "auto-transition": { type: "string" },
        "auto-assign": { type: "string" },
        "auto-worklog": { type: "string" },
        "require-worklog-before-completion": { type: "string" },
      },
      false
    );

    const payload = buildProjectFeaturesPayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one feature flag is required.");
    }

    const result = await projectClient.update(projectId, payload);
    printData(
      {
        id: result.id,
        identifier: result.identifier,
        name: result.name,
        ...pickProjectFeatures(result),
      },
      context.output
    );
    return;
  }

  throw new CliError(`Unknown project features subcommand: ${subcommand}`);
}

export async function runProjectCommand(args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (hasHelpFlag(rest)) {
    if (subcommand === "members") {
      printProjectMembersHelp();
      return;
    }
    if (subcommand === "features") {
      printProjectFeaturesHelp();
      return;
    }
    if (subcommand === "create") {
      printProjectCreateHelp();
      return;
    }
    if (subcommand === "update") {
      printProjectUpdateHelp();
      return;
    }
    printHelp();
    return;
  }

  const config = await resolveRuntimeConfig();
  const projectClient = new ProjectClient(new PlaneClient(config));

  if (subcommand === "members") {
    await runProjectMembersCommand(projectClient, rest, context);
    return;
  }

  if (subcommand === "features") {
    await runProjectFeaturesCommand(projectClient, rest, context);
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        limit: { type: "string" },
        cursor: { type: "string" },
        "order-by": { type: "string" },
        fields: { type: "string" },
        expand: { type: "string" },
      },
      false
    );

    const result = await projectClient.list(
      pickDefined({
        per_page: parsed.values.limit,
        cursor: parsed.values.cursor,
        order_by: parsed.values["order-by"],
        fields: parsed.values.fields,
        expand: parsed.values.expand,
      })
    );

    printData(result, {
      ...context.output,
      render: createProjectRender,
    });
    return;
  }

  if (subcommand === "get") {
    const [projectId] = rest;
    ensureValue(projectId, "Project ID is required.");
    const result = await projectClient.get(projectId);
    printData(result, context.output);
    return;
  }

  if (subcommand === "summary") {
    const parsed = parseCommandArgs(
      rest,
      {
        fields: { type: "string" },
      }
    );

    const [projectId] = parsed.positionals;
    ensureValue(projectId, "Project ID is required.");

    const result = await projectClient.summary(
      projectId,
      pickDefined({
        fields: parsed.values.fields,
      })
    );
    printData(result, context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(
      rest,
      {
        name: { type: "string" },
        identifier: { type: "string" },
        description: { type: "string" },
        "project-lead": { type: "string" },
        "default-assignee": { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.name, "Project name is required.");
    ensureValue(parsed.values.identifier, "Project identifier is required.");

    const { createPayload, postCreateUpdatePayload } = splitProjectCreatePayload(parsed.values);
    let result = await projectClient.create(createPayload);
    if (Object.keys(postCreateUpdatePayload).length > 0) {
      result = await projectClient.update(result.id, postCreateUpdatePayload);
    }

    printData(result, context.output);
    return;
  }

  if (subcommand === "update") {
    const [projectId, ...optionArgs] = rest;
    ensureValue(projectId, "Project ID is required.");

    const parsed = parseCommandArgs(
      optionArgs,
      {
        name: { type: "string" },
        identifier: { type: "string" },
        description: { type: "string" },
        "project-lead": { type: "string" },
        "default-assignee": { type: "string" },
      },
      false
    );

    const payload = buildProjectPayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one update field is required.");
    }

    const result = await projectClient.update(projectId, payload);
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown project subcommand: ${subcommand}`);
}
