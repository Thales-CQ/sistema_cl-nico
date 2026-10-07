import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { activeProfiles, hasSelectedProfile } from "../src/features/users/state/userProfileSelection.js";

test("only active API profiles are assignable and a new user needs one", () => {
  const profiles = [
    { id: 1, name: "Atendimento", is_active: true },
    { id: 2, name: "Arquivo", is_active: false },
    { id: 3, name: "Triagem", is_active: true },
  ];
  assert.deepEqual(activeProfiles(profiles).map((profile) => profile.id), [1, 3]);
  assert.equal(hasSelectedProfile([]), false);
  assert.equal(hasSelectedProfile([1, 3]), true);
});

test("profile selector displays multiple checked active profiles and its group error", async () => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, cacheDir: "/tmp/clinica-vite-tests" });
  try {
    const { default: ProfileMultiSelect } = await vite.ssrLoadModule("/src/components/ProfileMultiSelect/ProfileMultiSelect.jsx");
    const profiles = activeProfiles([
      { id: 1, name: "Atendimento", is_active: true },
      { id: 2, name: "Arquivo", is_active: false },
      { id: 3, name: "Triagem", is_active: true },
    ]);
    const html = renderToStaticMarkup(createElement(ProfileMultiSelect, {
      profiles, selectedIds: [1, 3], onChange() {}, error: "Selecione pelo menos um perfil.",
    }));
    assert.match(html, /<legend>Perfil de usuário<\/legend>/);
    assert.match(html, /Atendimento/);
    assert.match(html, /Triagem/);
    assert.doesNotMatch(html, /Arquivo/);
    assert.equal((html.match(/checked=""/g) || []).length, 2);
    assert.match(html, /Selecione pelo menos um perfil\./);
  } finally { await vite.close(); }
});

test("user creation loads profiles and sends profile_ids without is_admin", async () => {
  const api = await import("../src/services/api.js?create-with-profiles");
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, json: async () => path.endsWith("/auth/me")
      ? { csrf_token: "csrf", user: { is_admin: true } }
      : path.endsWith("/profiles") ? { profiles: [{ id: 1, name: "Atendimento", is_active: true }] }
        : { user: { id: 4 } } };
  };
  try {
    const profiles = await api.getProfiles();
    assert.deepEqual(activeProfiles(profiles.profiles).map((profile) => profile.id), [1]);
    await api.createUser({ username: "novo", profile_ids: [1, 3] });
    assert.equal(calls[0].path, "/api/v1/profiles");
    const write = calls.find((call) => call.path === "/api/v1/users");
    assert.deepEqual(JSON.parse(write.options.body), { username: "novo", profile_ids: [1, 3] });
    assert.equal(Object.hasOwn(JSON.parse(write.options.body), "is_admin"), false);
  } finally { globalThis.fetch = original; }
});

test("assignable profile catalog is used as the authoritative selector source", async () => {
  const api = await import("../src/services/api.js?assignable-profiles");
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, json: async () => path.endsWith("/auth/me")
      ? { csrf_token: "csrf", user: {} }
      : { profiles: [{ id: 9, name: "Administrador", is_active: true }] } };
  };
  try {
    const result = await api.getAssignableProfiles();
    assert.deepEqual(result.profiles.map((profile) => profile.name), ["Administrador"]);
    assert.equal(calls.find((call) => call.path === "/api/v1/users/assignable-profiles").path,
      "/api/v1/users/assignable-profiles");
  } finally { globalThis.fetch = original; }
});
