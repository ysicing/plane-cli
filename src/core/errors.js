export class CliError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "CliError";
    this.exitCode = options.exitCode ?? 1;
    this.details = options.details;
  }
}
