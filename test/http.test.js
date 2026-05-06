import test from "node:test";
import assert from "node:assert/strict";

import { buildApiUrl } from "../src/core/http.js";

test("buildApiUrl normalizes base url and query", () => {
  const url = buildApiUrl("https://plane.example.com/api/v1", "/users/me/", {
    cursor: "abc",
    per_page: 20,
    empty: "",
  });

  assert.equal(url.toString(), "https://plane.example.com/api/v1/users/me/?cursor=abc&per_page=20");
});
