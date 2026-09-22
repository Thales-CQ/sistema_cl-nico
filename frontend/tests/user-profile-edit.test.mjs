import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { editableProfiles, hasSelectedProfile } from "../src/pages/Users/userProfileSelection.js";
import { toggleProfileId } from "../src/components/ProfileMultiSelect/profileSelection.js";

const user = {
  id: 7, full_name: "Pessoa Exemplo", birth_date: "2000-01-02", email: "pessoa@example.com",
  username: "pessoa", is_active: true,
  profiles: [{ id: 1, name: "Atendimento", is_active: true }, { id: 2, name: "Arquivo", is_active: false }],
};
const catalog = [
  { id: 1, name: "Atendimento", is_active: true },
  { id: 2, name: "Arquivo", is_active: false },
  { id: 3, name: "Triagem", is_active: true },
  { id: 4, name: "Financeiro", is_active: false },
];

test("editing keeps assigned inactive profiles, supports multiple additions and removals", () => {
  assert.deepEqual(editableProfiles(catalog, user.profiles).map((profile) => profile.id), [1, 2, 3]);
  const original = user.profiles.map((profile) => profile.id);
  const added = toggleProfileId(original, 3, true);
  assert.deepEqual(added, [1, 2, 3]);
  assert.deepEqual(toggleProfileId(added, 2, false), [1, 3]);
  assert.deepEqual(original, [1, 2]);
  assert.equal(hasSelectedProfile(toggleProfileId([1], 1, false)), false);
});

test("edit form shows assigned inactive profile and has no legacy admin selector", async () => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, cacheDir: "/tmp/clinica-vite-tests" });
  try {
    const { default: UserCreate } = await vite.ssrLoadModule("/src/pages/Users/UserCreate/UserCreate.jsx");
    const html = renderToStaticMarkup(createElement(UserCreate, {
      user, availableProfiles: editableProfiles(catalog, user.profiles), isActive: true,
      onSaved() {}, onCancel() {},
    }));
    assert.match(html, /Atendimento/);
    assert.match(html, /Arquivo.*\(Inativo\)/);
    assert.match(html, /Triagem/);
    assert.doesNotMatch(html, /Financeiro/);
    assert.equal((html.match(/checked=""/g) || []).length, 2);
    assert.doesNotMatch(html, /name="is_admin"|id="user-admin"/);
    assert.match(html, /type="button"[^>]*>Cancelar<\/button>/);
  } finally { await vite.close(); }
});

test("loading user and profiles does not patch; update sends profile_ids without is_admin", async () => {
  const api = await import("../src/services/api.js?edit-with-profiles");
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, json: async () => path.endsWith("/auth/me")
      ? { csrf_token: "csrf", user: { is_admin: true } }
      : path.endsWith("/profiles") ? { profiles: catalog }
        : { user } };
  };
  try {
    const [loadedUser, loadedProfiles] = await Promise.all([api.getUser(7), api.getProfiles()]);
    assert.deepEqual(loadedUser.user.profiles.map((profile) => profile.id), [1, 2]);
    assert.deepEqual(editableProfiles(loadedProfiles.profiles, loadedUser.user.profiles).map((profile) => profile.id), [1, 2, 3]);
    assert.equal(calls.filter((call) => call.options.method === "PATCH").length, 0);
    await api.updateUser(7, { username: "pessoa", is_active: true, profile_ids: [1, 2, 3] });
    const writes = calls.filter((call) => call.options.method === "PATCH");
    assert.equal(writes.length, 1);
    assert.deepEqual(JSON.parse(writes[0].options.body), { username: "pessoa", is_active: true, profile_ids: [1, 2, 3] });
    assert.equal(Object.hasOwn(JSON.parse(writes[0].options.body), "is_admin"), false);
  } finally { globalThis.fetch = original; }
});
