import { printWorkspaceResourceHelp, runWorkspaceResourcesCommand } from "./workspace-resources.js";
import { loadConfig, saveConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { parseCommandArgs } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

function printHelp() {
  console.log(`Usage:
  plane workspace ls
  plane workspace current
  plane workspace use <slug> [--force]
  plane workspace invitations ls
  plane workspace invitations create --email <email> [--role <admin|member|guest>]
  plane workspace stickies ls
  plane workspace stickies create --name <name>
`);
}

function workspaceRows(config) {
  const known = config.knownWorkspaces || [];
  return known.map((slug) => ({
    slug,
    current: config.workspace === slug,
  }));
}

export async function runWorkspaceCommand(args, context) {
  const [subcommand = "ls", ...rest] = args;

  if (subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  if (rest.includes("--help") || rest.includes("-h") || rest.includes("help")) {
    if (subcommand === "invitations" || subcommand === "stickies") {
      printWorkspaceResourceHelp();
      return;
    }
    printHelp();
    return;
  }

  if (subcommand === "invitations" || subcommand === "stickies") {
    await runWorkspaceResourcesCommand([subcommand, ...rest], context);
    return;
  }

  const config = await loadConfig();

  if (subcommand === "ls") {
    const rows = workspaceRows(config);
    printData(rows, {
      ...context.output,
      render(data) {
        printTable(data, [
          { label: "Current", get: (row) => (row.current ? "*" : "") },
          { label: "Workspace", get: (row) => row.slug },
        ]);
      },
    });
    return;
  }

  if (subcommand === "current") {
    printData(
      {
        workspace: config.workspace || "",
        knownWorkspaces: config.knownWorkspaces || [],
      },
      context.output
    );
    return;
  }

  if (subcommand === "use") {
    const parsed = parseCommandArgs(
      rest,
      {
        force: { type: "boolean" },
      }
    );

    const [slug] = parsed.positionals;
    if (!slug) {
      throw new CliError("Workspace slug is required.");
    }

    const known = config.knownWorkspaces || [];
    if (!parsed.values.force && known.length > 0 && !known.includes(slug)) {
      throw new CliError(`Unknown workspace: ${slug}`, {
        details: {
          knownWorkspaces: known,
          hint: "Run `plane auth login` again or use --force if you know the slug is valid.",
        },
      });
    }

    const nextKnown = known.includes(slug) ? known : [...known, slug];
    const result = await saveConfig({
      workspace: slug,
      knownWorkspaces: nextKnown,
    });

    printData(
      {
        workspace: result.config.workspace,
        knownWorkspaces: result.config.knownWorkspaces || [],
      },
      context.output
    );
    return;
  }

  throw new CliError(`Unknown workspace subcommand: ${subcommand}`);
}
