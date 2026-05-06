import test from "node:test";
import assert from "node:assert/strict";

import { CookieJar } from "../src/core/session.js";

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
