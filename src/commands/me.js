import { UserClient } from "../api/user-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { printData } from "../core/output.js";

export async function runMeCommand(args, context) {
  if (args.includes("--help") || args.includes("-h") || args.includes("help")) {
    console.log("Usage:\n  plane me");
    return;
  }

  if (args.length > 0) {
    throw new CliError("`plane me` does not accept extra arguments.");
  }

  const config = await resolveRuntimeConfig();
  const client = new PlaneClient(config);
  const userClient = new UserClient(client);
  const user = await userClient.me();

  printData(user, context.output);
}
