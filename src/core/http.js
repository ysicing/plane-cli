import { CliError } from "./errors.js";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "").replace(/\/api$/, "");
}

export function buildApiUrl(baseUrl, path, query = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const url = new URL(`/api/v1${path}`, `${root}/`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

export class PlaneClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.workspace = config.workspace;
    this.knownWorkspaces = config.knownWorkspaces || [];
  }

  workspacePath(resource = "") {
    if (!this.workspace) {
      const hasKnownWorkspaces = this.knownWorkspaces.length > 0;
      throw new CliError(
        hasKnownWorkspaces
          ? "Workspace is not selected. Use `plane workspace current` to inspect state and `plane workspace use <slug>` to choose one."
          : "Workspace is required. Use `plane auth login` or `plane config set --workspace <slug>` first.",
        hasKnownWorkspaces
          ? {
              details: {
                knownWorkspaces: this.knownWorkspaces,
                hint: "Run `plane workspace ls` and then `plane workspace use <slug>`.",
              },
            }
          : undefined
      );
    }

    const suffix = resource.startsWith("/") ? resource : `/${resource}`;
    return `/workspaces/${this.workspace}${resource ? suffix : ""}`;
  }

  async request(method, path, options = {}) {
    if (!this.baseUrl) {
      throw new CliError("Base URL is required. Use `plane config set --base-url <url>` first.");
    }

    if (!this.apiKey) {
      throw new CliError("API key is required. Use `plane config set --api-key <key>` first.");
    }

    const url = buildApiUrl(this.baseUrl, path, options.query);
    const headers = {
      Accept: "application/json",
      "X-Api-Key": this.apiKey,
    };

    const requestInit = {
      method,
      headers,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, requestInit);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new CliError(`Plane API request failed: ${response.status} ${response.statusText}`, {
        exitCode: 1,
        details: payload,
      });
    }

    return payload;
  }

  get(path, query) {
    return this.request("GET", path, { query });
  }

  post(path, body) {
    return this.request("POST", path, { body });
  }

  patch(path, body) {
    return this.request("PATCH", path, { body });
  }

  delete(path) {
    return this.request("DELETE", path);
  }
}
