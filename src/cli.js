#!/usr/bin/env node

import { runAuthCommand } from "./commands/auth.js";
import { runConfigCommand } from "./commands/config.js";
import { runIssueCommand } from "./commands/issue.js";
import { runMeCommand } from "./commands/me.js";
import { runProjectCommand } from "./commands/project.js";
import { runWorkspaceCommand } from "./commands/workspace.js";
import { CliError } from "./core/errors.js";

function extractGlobalOptions(argv) {
  const args = [];
  const options = {
    format: "human",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--format") {
      const value = argv[index + 1];
      if (!value) {
        throw new CliError("`--format` requires a value: human or json.");
      }
      if (!["human", "json"].includes(value)) {
        throw new CliError(`Unsupported format: ${value}. Use human or json.`);
      }
      options.format = value;
      index += 1;
      continue;
    }

    args.push(arg);
  }

  return { args, options };
}

function printHelp() {
  console.log(`plane-cli

Usage:
  plane <command> [options]

Commands:
  auth        Sign in and bootstrap API credentials
  config      Manage local CLI config
  me          Show current authenticated user
  project     Manage projects
  issue       Manage work items through issue commands
  work-item   Alias of issue
  workspace   Manage selected workspace

Global options:
  --format    Output format: human|json
  --json      Alias of --format json
  --help      Show help
`);
}

async function main() {
  const { args, options } = extractGlobalOptions(process.argv.slice(2));
  const [command, ...rest] = args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const context = { output: options };

  switch (command) {
    case "auth":
      await runAuthCommand(rest, context);
      return;
    case "config":
      await runConfigCommand(rest, context);
      return;
    case "me":
      await runMeCommand(rest, context);
      return;
    case "project":
      await runProjectCommand(rest, context);
      return;
    case "workspace":
      await runWorkspaceCommand(rest, context);
      return;
    case "issue":
    case "work-item":
      await runIssueCommand(rest, context);
      return;
    default:
      throw new CliError(`Unknown command: ${command}`);
  }
}

function wantsJsonOutput(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--json") return true;
    if (argv[index] === "--format" && argv[index + 1] === "json") return true;
  }
  return false;
}

main().catch((error) => {
  const wantsJson = wantsJsonOutput(process.argv.slice(2));

  if (error instanceof CliError) {
    if (wantsJson) {
      console.error(
        JSON.stringify(
          {
            error: {
              message: error.message,
              details: error.details ?? null,
              exitCode: error.exitCode,
            },
          },
          null,
          2
        )
      );
    } else {
      console.error(`Error: ${error.message}`);
      if (error.details) {
        console.error(JSON.stringify(error.details, null, 2));
      }
    }
    process.exit(error.exitCode);
  }

  if (wantsJson) {
    console.error(
      JSON.stringify(
        {
          error: {
            message: error?.message || String(error),
            details: null,
            exitCode: 1,
          },
        },
        null,
        2
      )
    );
  } else {
    console.error(error);
  }
  process.exit(1);
});
