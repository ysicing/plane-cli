import test from "node:test";
import assert from "node:assert/strict";

import { buildApiUrl, buildUserAgent, PlaneClient } from "../src/core/http.js";

test("buildApiUrl normalizes base url and query", () => {
  const url = buildApiUrl("https://plane.example.com/api/v1", "/users/me/", {
    cursor: "abc",
    per_page: 20,
    empty: "",
  });

  assert.equal(url.toString(), "https://plane.example.com/api/v1/users/me/?cursor=abc&per_page=20");
});

test("buildApiUrl omits null query values", () => {
  const url = buildApiUrl("https://plane.example.com", "/workspaces/ws/me/work-items/", {
    state_group: "started",
    empty: null,
  });

  assert.equal(url.toString(), "https://plane.example.com/api/v1/workspaces/ws/me/work-items/?state_group=started");
});

test("buildUserAgent includes cli version os and arch", () => {
  assert.equal(buildUserAgent({ version: "1.3.0", platform: "darwin", arch: "arm64" }), "plane/1.3.0,os=macos,arch=arm64");
  assert.equal(buildUserAgent({ version: "1.3.0", platform: "win32", arch: "x64" }), "plane/1.3.0,os=windows,arch=x64");
});

test("PlaneClient sends user agent header", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit;

  globalThis.fetch = async (_url, init) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = new PlaneClient({
      baseUrl: "https://plane.example.com",
      apiKey: "token",
      workspace: "ops",
    });

    await client.get(client.workspacePath("/projects/"));
    assert.equal(capturedInit.headers["User-Agent"], buildUserAgent());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
