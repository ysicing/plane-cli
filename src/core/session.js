import { CliError } from "./errors.js";
import { buildUserAgent } from "./http.js";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "").replace(/\/api$/, "");
}

function parseSetCookie(setCookie) {
  const [pair] = setCookie.split(";", 1);
  const index = pair.indexOf("=");
  if (index === -1) return null;

  const name = pair.slice(0, index).trim();
  const value = pair.slice(index + 1).trim();
  if (!name) return null;

  return { name, value };
}

export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  set(name, value) {
    this.cookies.set(name, value);
  }

  get(name) {
    return this.cookies.get(name);
  }

  entries() {
    return [...this.cookies.entries()];
  }

  setFromResponse(response) {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")]
          : [];

    for (const item of setCookies) {
      const parsed = parseSetCookie(item);
      if (!parsed) continue;
      this.set(parsed.name, parsed.value);
    }
  }

  toHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function buildUrl(baseUrl, path) {
  return new URL(path, `${normalizeBaseUrl(baseUrl)}/`);
}

function extractLoginError(locationHeader) {
  if (!locationHeader) return undefined;

  try {
    const url = new URL(locationHeader, "https://plane.invalid");
    const errorCode = url.searchParams.get("error_code");
    const error = url.searchParams.get("error");
    const errorMessage = url.searchParams.get("error_message");
    const parts = [errorCode, errorMessage, error].filter(Boolean);
    return parts.length ? parts.join(": ") : undefined;
  } catch {
    return undefined;
  }
}

export class PlaneSessionClient {
  constructor(baseUrl) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.cookies = new CookieJar();
    this.csrfToken = undefined;
  }

  async fetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("User-Agent", headers.get("User-Agent") || buildUserAgent());
    const cookieHeader = this.cookies.toHeader();
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await fetch(buildUrl(this.baseUrl, path), {
      ...options,
      headers,
    });

    this.cookies.setFromResponse(response);
    return response;
  }

  async initializeCsrf() {
    const response = await this.fetch("/auth/get-csrf-token/");
    const payload = await response.json();

    if (!response.ok || !payload?.csrf_token) {
      throw new CliError("Failed to initialize CSRF token.", {
        details: payload,
      });
    }

    this.csrfToken = payload.csrf_token;
    return payload.csrf_token;
  }

  async login({ username, password, ldap = false }) {
    const csrfToken = this.csrfToken || (await this.initializeCsrf());
    const params = new URLSearchParams();
    params.set("email", username);
    params.set("password", password);
    params.set("csrfmiddlewaretoken", csrfToken);
    params.set("next_path", "/");

    const response = await this.fetch(ldap ? "/auth/ldap/sign-in/" : "/auth/sign-in/", {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFTOKEN": csrfToken,
        Referer: this.baseUrl,
      },
      body: params.toString(),
    });

    const hasSessionCookie = this.cookies.entries().some(([name]) => name !== "csrftoken");
    if (!hasSessionCookie) {
      throw new CliError("Login failed.", {
        details: {
          location: response.headers.get("location"),
          error: extractLoginError(response.headers.get("location")),
        },
      });
    }

    return {
      location: response.headers.get("location"),
      ldap,
    };
  }

  async request(method, path, body) {
    const headers = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      throw new CliError(`Plane session request failed: ${response.status} ${response.statusText}`, {
        details: payload,
      });
    }

    return payload;
  }

  createApiToken(body) {
    return this.request("POST", "/api/users/api-tokens/", body);
  }

  listUserWorkspaces() {
    return this.request("GET", "/api/users/me/workspaces/");
  }
}
