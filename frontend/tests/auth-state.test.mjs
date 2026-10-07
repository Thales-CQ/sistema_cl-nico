import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission, normalizeUser } from "../src/contexts/authState.js";

test("normalizes missing and malformed permissions without dropping user fields", () => {
  const user = normalizeUser({ id: 1, username: "ADMIN", is_admin: true });
  assert.deepEqual(user, { id: 1, username: "ADMIN", is_admin: true, permissions: [] });
  assert.deepEqual(normalizeUser({ id: 2, permissions: ["patients.view", 3, null] }), {
    id: 2, permissions: ["patients.view"],
  });
});

test("hasPermission checks only user permissions", () => {
  assert.equal(hasPermission({ is_admin: true }, "profiles.view"), false);
  assert.equal(hasPermission({ permissions: ["patients.view"] }, "patients.view"), true);
  assert.equal(hasPermission({ permissions: ["patients.view"] }, "patients.update"), false);
});
