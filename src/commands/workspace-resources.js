import { WorkspaceClient } from "../api/workspace-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { ensureValue, parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

const WORKSPACE_ROLE_MAP = {
  admin: 20,
  member: 15,
  guest: 5,
};

export function normalizeWorkspaceRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const role = WORKSPACE_ROLE_MAP[normalized];
  if (!role) {
    throw new CliError("Role must be one of: admin, member, guest.");
  }
  return role;
}

export function buildWorkspaceInvitationPayload(values) {
  return pickDefined({
    email: values.email,
    role: values.role ? normalizeWorkspaceRole(values.role) : undefined,
  });
}

export function buildStickyPayload(values) {
  return pickDefined({
    name: values.name,
    description_html: values.html,
    color: values.color,
    background_color: values["background-color"],
    sort_order: values["sort-order"],
  });
}

function hasHelpFlag(args) {
  return args.includes("--help") || args.includes("-h") || args.includes("help");
}

function createWorkspaceClient(config) {
  return new WorkspaceClient(new PlaneClient(config));
}

function renderInvitations(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Email", get: (row) => row.email || "" },
    { label: "Role", get: (row) => row.role ?? "" },
    { label: "Accepted", get: (row) => (row.accepted ? "yes" : "no") },
  ]);
}

function renderStickies(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Name", get: (row) => row.name || "" },
    { label: "Color", get: (row) => row.color || "" },
    { label: "Background", get: (row) => row.background_color || "" },
  ]);
}

export function printWorkspaceResourceHelp() {
  console.log(`Usage:
  plane workspace invitations ls
  plane workspace invitations get <invite-id>
  plane workspace invitations create --email <email> [--role <admin|member|guest>]
  plane workspace invitations update <invite-id> [--email <email>] [--role <admin|member|guest>]
  plane workspace invitations delete <invite-id> --confirm
  plane workspace stickies ls
  plane workspace stickies get <sticky-id>
  plane workspace stickies create --name <name> [--html <html>] [--color <value>] [--background-color <value>] [--sort-order <n>]
  plane workspace stickies update <sticky-id> [--name <name>] [--html <html>] [--color <value>] [--background-color <value>] [--sort-order <n>]
  plane workspace stickies delete <sticky-id> --confirm
`);
}

async function runInvitationsCommand(client, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help" || hasHelpFlag(rest)) {
    printWorkspaceResourceHelp();
    return;
  }

  if (subcommand === "ls") {
    const result = await client.listInvitations();
    printData(result, { ...context.output, render: renderInvitations });
    return;
  }

  if (subcommand === "get") {
    const [invitationId] = rest;
    ensureValue(invitationId, "Invitation ID is required.");
    printData(await client.getInvitation(invitationId), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(rest, {
      email: { type: "string" },
      role: { type: "string" },
    }, false);
    ensureValue(parsed.values.email, "Email is required.");
    printData(await client.createInvitation(buildWorkspaceInvitationPayload(parsed.values)), context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(rest, {
      email: { type: "string" },
      role: { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Invitation ID is required.");
    const payload = buildWorkspaceInvitationPayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one update field is required.");
    }
    printData(await client.updateInvitation(parsed.positionals[0], payload), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseCommandArgs(rest, {
      confirm: { type: "boolean" },
    });
    ensureValue(parsed.positionals[0], "Invitation ID is required.");
    if (!parsed.values.confirm) {
      throw new CliError("Deletion requires --confirm.");
    }
    await client.deleteInvitation(parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }

  throw new CliError(`Unknown workspace invitations subcommand: ${subcommand}`);
}

async function runStickiesCommand(client, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help" || hasHelpFlag(rest)) {
    printWorkspaceResourceHelp();
    return;
  }

  if (subcommand === "ls") {
    const result = await client.listStickies();
    printData(result, { ...context.output, render: renderStickies });
    return;
  }

  if (subcommand === "get") {
    const [stickyId] = rest;
    ensureValue(stickyId, "Sticky ID is required.");
    printData(await client.getSticky(stickyId), context.output);
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(rest, {
      name: { type: "string" },
      html: { type: "string" },
      color: { type: "string" },
      "background-color": { type: "string" },
      "sort-order": { type: "string" },
    }, false);
    const payload = buildStickyPayload(parsed.values);
    printData(await client.createSticky(payload), context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(rest, {
      name: { type: "string" },
      html: { type: "string" },
      color: { type: "string" },
      "background-color": { type: "string" },
      "sort-order": { type: "string" },
    });
    ensureValue(parsed.positionals[0], "Sticky ID is required.");
    const payload = buildStickyPayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one update field is required.");
    }
    printData(await client.updateSticky(parsed.positionals[0], payload), context.output);
    return;
  }

  if (subcommand === "delete") {
    const parsed = parseCommandArgs(rest, {
      confirm: { type: "boolean" },
    });
    ensureValue(parsed.positionals[0], "Sticky ID is required.");
    if (!parsed.values.confirm) {
      throw new CliError("Deletion requires --confirm.");
    }
    await client.deleteSticky(parsed.positionals[0]);
    printData({ deleted: true, id: parsed.positionals[0] }, context.output);
    return;
  }

  throw new CliError(`Unknown workspace stickies subcommand: ${subcommand}`);
}

export async function runWorkspaceResourcesCommand(args, context) {
  const [subcommand, ...rest] = args;
  const config = await resolveRuntimeConfig();
  const client = createWorkspaceClient(config);

  if (subcommand === "invitations") {
    await runInvitationsCommand(client, rest, context);
    return;
  }

  if (subcommand === "stickies") {
    await runStickiesCommand(client, rest, context);
    return;
  }

  throw new CliError(`Unknown workspace resource subcommand: ${subcommand}`);
}
