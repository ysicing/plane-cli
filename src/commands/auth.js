import { readFile } from "node:fs/promises";

import { loadConfig, maskApiKey, saveConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { ensureValue, parseCommandArgs } from "../core/options.js";
import { printData } from "../core/output.js";
import { PlaneSessionClient } from "../core/session.js";

function printHelp() {
  console.log(`Usage:
  plane auth login --base-url <plane-url> [--ldap] (--username <value> | --email <value>) [--password <value> | --password-stdin] [--workspace <slug>] [--token-label <label>]
`);
}

function defaultTokenLabel() {
  return `plane-cli-${new Date().toISOString()}`;
}

async function readPasswordFromStdin() {
  const content = await readFile(0, "utf8");
  return content.trim();
}

function resolveWorkspaceToSave({ explicitWorkspace, existingWorkspace, userWorkspaces }) {
  const known = Array.isArray(userWorkspaces) ? userWorkspaces.map((item) => item.slug) : [];

  if (explicitWorkspace) {
    if (!known.includes(explicitWorkspace)) {
      throw new CliError(`Workspace not found for this account: ${explicitWorkspace}`, {
        details: {
          knownWorkspaces: known,
        },
      });
    }
    return explicitWorkspace;
  }

  if (known.length === 1) {
    return known[0];
  }

  if (known.length > 1) {
    return null;
  }

  return existingWorkspace || null;
}

export async function runAuthCommand(args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand !== "login") {
    throw new CliError(`Unknown auth subcommand: ${subcommand}`);
  }

  if (rest.includes("--help") || rest.includes("-h") || rest.includes("help")) {
    printHelp();
    return;
  }

  const parsed = parseCommandArgs(
    rest,
    {
      "base-url": { type: "string" },
      ldap: { type: "boolean" },
      username: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
      "password-stdin": { type: "boolean" },
      workspace: { type: "string" },
      "token-label": { type: "string" },
    },
    false
  );

  const existingConfig = await loadConfig();
  const baseUrl = parsed.values["base-url"] || existingConfig.baseUrl;
  ensureValue(baseUrl, "Base URL is required. Pass --base-url or set it with `plane config set --base-url ...`.");

  const username = parsed.values.username || parsed.values.email;
  ensureValue(username, "Username is required. Pass --username or --email.");

  let password = parsed.values.password;
  if (!password && parsed.values["password-stdin"]) {
    password = await readPasswordFromStdin();
  }
  ensureValue(password, "Password is required. Pass --password or --password-stdin.");

  const sessionClient = new PlaneSessionClient(baseUrl);
  await sessionClient.login({
    username,
    password,
    ldap: Boolean(parsed.values.ldap),
  });

  const tokenLabel = parsed.values["token-label"] || defaultTokenLabel();
  const token = await sessionClient.createApiToken({
    label: tokenLabel,
    description: "Created by plane-cli auth login",
  });
  const workspaces = await sessionClient.listUserWorkspaces();
  const knownWorkspaces = Array.isArray(workspaces) ? workspaces.map((item) => item.slug) : [];

  const workspace = resolveWorkspaceToSave({
    explicitWorkspace: parsed.values.workspace,
    existingWorkspace: existingConfig.workspace,
    userWorkspaces: workspaces,
  });

  const saved = await saveConfig({
    baseUrl,
    apiKey: token.token,
    workspace,
    knownWorkspaces,
  });

  printData(
    {
      path: saved.path,
      baseUrl: saved.config.baseUrl,
      workspace: saved.config.workspace || "",
      apiKey: maskApiKey(saved.config.apiKey),
      loginMode: parsed.values.ldap ? "ldap" : "password",
      tokenId: token.id,
      tokenLabel: token.label,
      detectedWorkspaces: knownWorkspaces,
      workspaceSelectionRequired: !saved.config.workspace && knownWorkspaces.length > 1,
    },
    context.output
  );
}
