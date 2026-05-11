#!/usr/bin/env node

import { Command } from "commander";

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
  createProgram({ output: { format: "human" } }).outputHelp();
}

function createProgram(context) {
  const program = new Command();

  program
    .name("plane")
    .description("Manage Plane workspaces, projects, and work items")
    .option("--format <format>", "Output format: human|json")
    .option("--json", "Alias of --format json")
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  program
    .command("auth")
    .description("Sign in and bootstrap API credentials")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runAuthCommand(args, context));

  program
    .command("config")
    .description("Manage local CLI config")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runConfigCommand(args, context));

  program
    .command("me")
    .description("Show current authenticated user and assigned work")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runMeCommand(args, context));

  program
    .command("project")
    .description("Manage projects")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runProjectCommand(args, context));

  program
    .command("workspace")
    .description("Manage selected workspace")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runWorkspaceCommand(args, context));

  program
    .command("issue")
    .description("Manage work items")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runIssueCommand(args, context));

  program
    .command("work-item")
    .description("Alias of issue")
    .argument("[args...]")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((args) => runIssueCommand(args, context));

  return program;
}

async function main() {
  const { args, options } = extractGlobalOptions(process.argv.slice(2));
  const [command, ...rest] = args;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const context = { output: options };

  if (command === "help") {
    const [helpCommand, ...helpRest] = rest;
    if (!helpCommand) {
      printHelp();
      return;
    }
    const helpArgs = [...helpRest, "--help"];
    switch (helpCommand) {
      case "auth":
        await runAuthCommand(helpArgs, context);
        return;
      case "config":
        await runConfigCommand(helpArgs, context);
        return;
      case "me":
        await runMeCommand(helpArgs, context);
        return;
      case "project":
        await runProjectCommand(helpArgs, context);
        return;
      case "workspace":
        await runWorkspaceCommand(helpArgs, context);
        return;
      case "issue":
      case "work-item":
        await runIssueCommand(helpArgs, context);
        return;
      default:
        throw new CliError(`Unknown command: ${helpCommand}`);
    }
  }

  const program = createProgram(context);
  program.exitOverride((error) => {
    throw new CliError(error.message);
  });

  if (!program.commands.some((item) => item.name() === command)) {
    throw new CliError(`Unknown command: ${command}`);
  }

  await program.parseAsync([command, ...rest], { from: "user" });
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
