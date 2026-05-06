import { loadConfig, maskApiKey, resolveConfigPath, saveConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { parseCommandArgs, pickDefined } from "../core/options.js";
import { printData } from "../core/output.js";

function configSnapshot(config, path) {
  return {
    path,
    baseUrl: config.baseUrl || "",
    apiKey: maskApiKey(config.apiKey),
    workspace: config.workspace || "",
    knownWorkspaces: config.knownWorkspaces || [],
  };
}

function printHelp() {
  console.log(`Usage:
  plane config list
  plane config get [baseUrl|apiKey|workspace|knownWorkspaces]
  plane config set [--base-url <url>] [--api-key <key>] [--workspace <slug>]
`);
}

function printGetHelp() {
  console.log(`Usage:
  plane config get
  plane config get <baseUrl|apiKey|workspace|knownWorkspaces>
`);
}

function printSetHelp() {
  console.log(`Usage:
  plane config set [--base-url <url>] [--api-key <key>] [--workspace <slug>]
`);
}

export async function runConfigCommand(args, context) {
  const [subcommand = "list", ...rest] = args;
  const path = resolveConfigPath();

  if (subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "list") {
    const config = await loadConfig();
    printData(configSnapshot(config, path), context.output);
    return;
  }

  if (subcommand === "get") {
    if (rest.includes("--help") || rest.includes("-h") || rest.includes("help")) {
      printGetHelp();
      return;
    }

    const [key] = rest;
    const config = await loadConfig();
    const snapshot = configSnapshot(config, path);

    if (!key) {
      printData(snapshot, context.output);
      return;
    }

    if (!(key in snapshot)) {
      throw new CliError(`Unknown config key: ${key}`);
    }

    printData({ [key]: snapshot[key] }, context.output);
    return;
  }

  if (subcommand === "set") {
    if (rest.includes("--help") || rest.includes("-h") || rest.includes("help")) {
      printSetHelp();
      return;
    }

    const parsed = parseCommandArgs(
      rest,
      {
        "base-url": { type: "string" },
        "api-key": { type: "string" },
        workspace: { type: "string" },
      },
      false
    );

    const update = pickDefined({
      baseUrl: parsed.values["base-url"],
      apiKey: parsed.values["api-key"],
      workspace: parsed.values.workspace,
    });

    if (!update.baseUrl && !update.apiKey && !update.workspace) {
      throw new CliError("Nothing to update. Pass at least one of --base-url, --api-key, or --workspace.");
    }

    const result = await saveConfig(update);
    printData(configSnapshot(result.config, result.path), context.output);
    return;
  }

  throw new CliError(`Unknown config subcommand: ${subcommand}`);
}
