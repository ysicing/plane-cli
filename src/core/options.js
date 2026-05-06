import { parseArgs } from "node:util";
import { CliError } from "./errors.js";

export function parseCommandArgs(args, options, allowPositionals = true) {
  try {
    return parseArgs({
      args,
      options,
      allowPositionals,
      strict: true,
    });
  } catch (error) {
    throw new CliError(error.message);
  }
}

export function ensureValue(value, message) {
  if (!value) {
    throw new CliError(message);
  }
}

export function splitCsv(value) {
  if (!value) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function pickDefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
