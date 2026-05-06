import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const CONFIG_KEYS = ["baseUrl", "apiKey", "workspace", "knownWorkspaces"];

function normalizeBaseUrl(value) {
  if (!value) return value;
  return value.replace(/\/+$/, "").replace(/\/api\/v1$/, "").replace(/\/api$/, "");
}

function normalizeValue(key, value) {
  if (key === "knownWorkspaces") {
    if (!Array.isArray(value)) return undefined;
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (key === "baseUrl") return normalizeBaseUrl(trimmed);
  return trimmed;
}

function sanitizeConfig(input) {
  const next = {};

  for (const key of CONFIG_KEYS) {
    const normalized = normalizeValue(key, input[key]);
    if (normalized !== undefined) {
      next[key] = normalized;
    }
  }

  return next;
}

export function resolveConfigPath() {
  if (process.env.PLANE_CLI_CONFIG_PATH) {
    return process.env.PLANE_CLI_CONFIG_PATH;
  }

  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "plane-cli", "config.json");
}

export async function loadConfig() {
  const configPath = resolveConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    return sanitizeConfig(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function saveConfig(partial) {
  const configPath = resolveConfigPath();
  const current = await loadConfig();
  const merged = { ...current };

  for (const [key, value] of Object.entries(partial)) {
    if (value === null) {
      delete merged[key];
      continue;
    }
    merged[key] = value;
  }

  const next = sanitizeConfig(merged);

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  return { path: configPath, config: next };
}

export async function resolveRuntimeConfig(overrides = {}) {
  const fileConfig = await loadConfig();
  const envConfig = sanitizeConfig({
    baseUrl: process.env.PLANE_BASE_URL,
    apiKey: process.env.PLANE_API_KEY,
    workspace: process.env.PLANE_WORKSPACE,
  });

  return sanitizeConfig({
    ...fileConfig,
    ...envConfig,
    ...overrides,
  });
}

export function maskApiKey(value) {
  if (!value) return "";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
