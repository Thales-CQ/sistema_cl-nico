import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { editableProfiles, hasSelectedProfile } from "../src/features/users/state/userProfileSelection.js";
import { statusChanged } from "../src/features/users/state/userEditState.js";
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

test("user edit compares the original status with the desired local status", async () => {
  assert.equal(statusChanged(true, false), true);
  assert.equal(statusChanged(false, true), true);
  assert.equal(statusChanged(true, true), false);
  assert.equal(statusChanged(false, false), false);
});

test("user edit combines status with data updates and keeps the status endpoint for profiles-only edits", async () => {
  const featureSource = await readFile(
    new URL("../src/features/users/UserEditFeature.jsx", import.meta.url),
    "utf8",
  );
  assert.match(featureSource, /canChangeStatus=\{canChangeStatusWithData\}/);

  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  const originalFetch = globalThis.fetch;
  const originalFormData = globalThis.FormData;
  const calls = [];
  const serverUsers = new Map([
    [7, { ...user }],
    [8, { ...user, id: 8 }],
  ]);
  globalThis.FormData = class TestFormData {
    constructor(form) { this.values = form.values; }
    get(name) { return this.values[name] ?? ""; }
  };
  globalThis.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.endsWith("/auth/me")) {
      return { ok: true, status: 200, json: async () => ({ csrf_token: "user-edit-csrf", user: { id: 1 } }) };
    }
    const userId = Number(path.match(/\/users\/(\d+)/)?.[1]);
    const payload = JSON.parse(options.body);
    const currentUser = serverUsers.get(userId);
    const updatedUser = path.endsWith("/status")
      ? { ...currentUser, is_active: payload.is_active }
      : { ...currentUser, ...payload };
    serverUsers.set(userId, updatedUser);
    return { ok: true, status: 200, json: async () => ({ user: updatedUser }) };
  };

  try {
    const [{ default: useUserForm }, { completeUserEditStatus }] = await Promise.all([
      vite.ssrLoadModule("/src/features/users/hooks/useUserForm.js"),
      vite.ssrLoadModule("/src/features/users/hooks/useUserEdit.js"),
    ]);
    async function submitEdit(editUser, options) {
      let submit;
      function FormHarness() {
        const form = useUserForm({
          user: editUser,
          isActive: false,
          onSaved() {},
          ...options,
        });
        submit = form.handleSubmit;
        return null;
      }
      renderToStaticMarkup(createElement(FormHarness));
      await submit({
        preventDefault() {},
        currentTarget: { values: {
          full_name: "Ana Silva",
          email: "ana@example.com",
          username: "ana",
          birth_date: "02/01/2000",
        } },
      });
    }

    await submitEdit(user, {
      canUpdateData: true,
      canAssignProfiles: true,
      canChangeStatus: true,
    });
    const combinedResult = await completeUserEditStatus(serverUsers.get(7), {
      originalIsActive: true,
      desiredStatus: false,
      statusIncluded: true,
    });
    const combinedWrites = calls.filter(({ path, options }) => (
      path.startsWith("/api/v1/users/7") && options.method === "PATCH"
    ));
    const combinedRequest = calls.find(({ path, options }) => path === "/api/v1/users/7" && options.method === "PATCH");
    assert.equal(combinedResult.is_active, false);
    assert.deepEqual(combinedWrites.map(({ path }) => path), ["/api/v1/users/7"]);
    assert.deepEqual(JSON.parse(combinedRequest.options.body), {
      full_name: "Ana Silva",
      email: "ana@example.com",
      username: "ana",
      profile_ids: [1, 2],
      birth_date: "2000-01-02",
      is_active: false,
    });
    assert.equal(calls.some(({ path }) => path === "/api/v1/users/7/status"), false);

    await submitEdit({ ...user, id: 8 }, {
      canUpdateData: false,
      canAssignProfiles: true,
      canChangeStatus: false,
    });
    const profileUpdate = calls.find(({ path, options }) => path === "/api/v1/users/8" && options.method === "PATCH");
    assert.deepEqual(JSON.parse(profileUpdate.options.body), { profile_ids: [1, 2] });
    const profilesOnlyResult = await completeUserEditStatus(serverUsers.get(8), {
      originalIsActive: true,
      desiredStatus: false,
      statusIncluded: false,
    });
    assert.equal(profilesOnlyResult.is_active, false);
    assert.deepEqual(calls.filter(({ path, options }) => path.startsWith("/api/v1/users/8") && options.method === "PATCH")
      .map(({ path }) => path), ["/api/v1/users/8", "/api/v1/users/8/status"]);
    assert.deepEqual(JSON.parse(calls.find(({ path }) => path === "/api/v1/users/8/status").options.body), { is_active: false });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FormData = originalFormData;
    await vite.close();
  }
});

test("edit form shows assigned inactive profile and has no legacy admin selector", async () => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, cacheDir: "/tmp/clinica-vite-tests" });
  try {
    const { default: UserCreate } = await vite.ssrLoadModule("/src/features/users/UserFormFeature.jsx");
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
