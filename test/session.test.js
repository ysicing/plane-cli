import test from "node:test";
import assert from "node:assert/strict";

import { buildUserAgent } from "../src/core/http.js";
import { CookieJar, PlaneSessionClient } from "../src/core/session.js";

test("cookie jar stores cookies from getSetCookie headers", () => {
  const jar = new CookieJar();
  const response = {
    headers: {
      getSetCookie() {
        return [
          "csrftoken=abc123; Path=/; HttpOnly",
          "session-id=session123; Path=/; HttpOnly",
        ];
      },
    },
  };

  jar.setFromResponse(response);

  assert.equal(jar.get("csrftoken"), "abc123");
  assert.equal(jar.get("session-id"), "session123");
  assert.equal(jar.toHeader(), "csrftoken=abc123; session-id=session123");
});

test("PlaneSessionClient sends user agent header", async () => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders;

  globalThis.fetch = async (_url, init) => {
    capturedHeaders = init.headers;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = new PlaneSessionClient("https://plane.example.com");
    await client.fetch("/auth/get-csrf-token/");
    assert.equal(capturedHeaders.get("User-Agent"), buildUserAgent());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
