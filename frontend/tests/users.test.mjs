import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { apiBirthDate, displayBirthDate, maskBirthDate, validatePasswordConfirmation, validateUserFullName } from "../src/pages/Users/userForm.js";
import { findDestination, resolveDestination, navigationForUser } from "../src/routes/navigation.js";

// Run with node --test tests/*.test.mjs; no extra dependencies.
test("user full name requires two words and accepts particles and extra spaces", () => {
  for (const value of ["JOÃO", " MARIA ", "   ", "JOÃO -"]) {
    assert.throws(() => validateUserFullName(value), /nome e sobrenome/);
  }
  for (const value of ["JOÃO SILVA", "MARIA SOUZA", " João  da Silva ", "ANA MARIA COSTA", "A B"]) {
    validateUserFullName(value);
  }
});

test("new user form has no status control", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  try {
    const { default: UserCreate } = await vite.ssrLoadModule("/src/pages/Users/UserCreate/UserCreate.jsx");
    const html = renderToStaticMarkup(createElement(UserCreate, { onSaved() {}, onCancel() {} }));
    assert.doesNotMatch(html, /name="is_active"|id="user-active"|>Status</);
    assert.doesNotMatch(html, /name="is_admin"/);
    assert.match(html, /Perfil de usuário/);
    assert.match(html, /Carregando perfis/);
    assert.match(html, /name="password"/);
    assert.match(html, /placeholder="DD\/MM\/AAAA"/);
    assert.match(html, /placeholder="Mínimo de 12 caracteres\."/);
    assert.doesNotMatch(html, /id="user-birth-date-hint"|id="user-password-hint"/);
    const { default: PasswordForm } = await vite.ssrLoadModule("/src/components/PasswordForm/PasswordForm.jsx");
    const passwordHtml = renderToStaticMarkup(createElement(PasswordForm, { onCancel() {} }));
    assert.match(passwordHtml, /placeholder="Mínimo de 12 caracteres\."/);
    assert.doesNotMatch(passwordHtml, /<p class="users__hint">Use uma nova senha/);
  } finally {
    await vite.close();
  }
});

test("header and dashboard prefer full name and fall back to legacy username", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  try {
    const [{ default: Header }, { default: Dashboard }, { ThemeContext }] = await Promise.all([
      vite.ssrLoadModule("/src/components/Header/Header.jsx"),
      vite.ssrLoadModule("/src/pages/Dashboard/Dashboard.jsx"),
      vite.ssrLoadModule("/src/contexts/ThemeContext.js"),
    ]);
    const renderHeader = (user) => renderToStaticMarkup(createElement(
      ThemeContext.Provider, { value: { theme: "light", toggleTheme() {}, themeUpdating: false } },
      createElement(Header, { user, onLogout() {} }),
    ));
    const renderDashboard = (user) => renderToStaticMarkup(createElement(Dashboard, { user }));
    const named = { full_name: "THALES COSTA QUEIROGA", username: "THALES" };
    for (const html of [renderHeader(named), renderDashboard(named)]) {
      assert.match(html, /THALES COSTA QUEIROGA/);
      assert.doesNotMatch(html, /THALES(?:<|!)/);
    }
    const legacy = { full_name: null, username: "THALES" };
    assert.match(renderHeader(legacy), /<strong>THALES<\/strong>/);
    assert.match(renderDashboard(legacy), /Olá, THALES!/);
  } finally {
    await vite.close();
  }
});

test("Brazilian dates round-trip without timezone conversion", () => {
  for (const [display, api] of [["29/02/2000", "2000-02-29"], ["02/01/1980", "1980-01-02"], ["01/01/0001", "0001-01-01"]]) {
    assert.equal(apiBirthDate(display), api);
    assert.equal(displayBirthDate(api), display);
  }
  assert.equal(displayBirthDate(null), "");
});

test("invalid, non-Brazilian and future dates are rejected", () => {
  for (const value of ["29/02/1900", "31/04/2000", "01/13/2000", "00/01/2000", "01/01/0000", "1980-01-02", "1/1/1980", "01/01/9999", ""]) {
    assert.throws(() => apiBirthDate(value));
  }
});

test("confirmation and character-count policy match the API without trimming", () => {
  assert.throws(() => validatePasswordConfirmation("12345678901", "12345678901"));
  assert.throws(() => validatePasswordConfirmation("123456789012", "123456789013"));
  assert.throws(() => validatePasswordConfirmation("😀".repeat(6), "😀".repeat(6)));
  validatePasswordConfirmation("123456789012", "123456789012");
  validatePasswordConfirmation(" 12345678901", " 12345678901");
});

test("users and password hashes resolve to real views; patient routes remain intact", () => {
  assert.equal(resolveDestination("#/usuarios").routeId, "usuarios-consultar");
  assert.equal(resolveDestination("#/usuarios/cadastrar").view, "cadastrar");
  for (const hash of ["#/usuarios", "#/usuarios/consultar", "#/usuarios/cadastrar"]) {
    assert.equal(resolveDestination(hash).id, "usuarios");
    assert.equal(resolveDestination(hash).moduleId, "configuracoes");
  }
  assert.equal(findDestination("usuarios-cadastrar").href, "#/usuarios/cadastrar");
  assert.equal(findDestination("usuarios").href, "#/usuarios/consultar");
  assert.equal(resolveDestination("#/alterar-senha").id, "alterar-senha");
  assert.equal(findDestination("alterar-senha").href, "#/alterar-senha");
  assert.equal(resolveDestination("#/pacientes").routeId, "pacientes-consultar");
  assert.equal(resolveDestination("#/fake").id, "inicio");
});

test("administration navigation requires an explicit boolean admin flag", () => {
  for (const user of [null, {}, { is_admin: false }, { is_admin: "true" }]) {
    assert.ok(!navigationForUser(user).some((item) => item.id === "configuracoes"));
  }
  const items = navigationForUser({ is_admin: true });
  assert.ok(!items.some((item) => item.id === "usuarios"));
  const settings = items.find((item) => item.id === "configuracoes");
  assert.deepEqual(settings.children.map((item) => item.label), ["Usuários", "Perfis"]);
  assert.equal(settings.children[0].href, "#/usuarios/consultar");
  assert.equal(settings.children[0].children, undefined);
  assert.ok(!settings.disabled);
});

test("main navigation keeps the requested hierarchy and disabled modules", async () => {
  const { navigationItems } = await import("../src/routes/navigation.js?menu-tree");
  assert.deepEqual(navigationItems.map((item) => item.label), [
    "Início", "Atendimento", "Financeiro", "Relatório", "Configurações",
  ]);
  const atendimento = navigationItems.find((item) => item.id === "atendimento");
  assert.deepEqual(atendimento.children.map((item) => item.label), ["Pacientes", "Agendamento", "Atendimento"]);
  assert.equal(atendimento.children[0].href, "#/pacientes/consultar");
  assert.equal(atendimento.children[0].children, undefined);
  assert.equal(atendimento.children[1].disabled, true);
  assert.equal(atendimento.children[2].disabled, true);
  assert.equal(navigationItems.find((item) => item.id === "financeiro").disabled, true);
  assert.equal(navigationItems.find((item) => item.id === "relatorios").disabled, true);
});

test("user API methods preserve CSRF, credentials and exact password/status contracts", async () => {
  const api = await import("../src/services/api.js?users-contract");
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, ...options });
    return { ok: true, status: 200, json: async () => path.endsWith("/auth/me")
      ? { csrf_token: "csrf-example", user: { id: 1, is_admin: true } } : { user: { id: 2 }, users: [] } };
  };
  try {
    const createPayload = {
      full_name: "Test User", birth_date: "2000-02-29", email: "test@example.com",
      username: "test", password: "example-password", profile_ids: [2],
    };
    const updatePayload = { username: "test", birth_date: "2000-02-29" };
    await api.createUser(createPayload);
    await api.updateUser(2, updatePayload);
    await api.updateUserStatus(2, false);
    await api.resetUserPassword(2, "new-example-password");
    await api.changeOwnPassword("old-example-password", "new-example-password");
    await api.getUsers();
    await api.getUser(2);
    assert.equal(calls[0].path, "/api/v1/auth/me");
    assert.equal(Object.hasOwn(JSON.parse(calls[1].body), "is_active"), false);
    assert.deepEqual(calls.slice(1, 6).map((call) => [call.path, call.method, JSON.parse(call.body)]), [
      ["/api/v1/users", "POST", createPayload],
      ["/api/v1/users/2", "PATCH", updatePayload],
      ["/api/v1/users/2/status", "PATCH", { is_active: false }],
      ["/api/v1/users/2/password", "PATCH", { new_password: "new-example-password" }],
      ["/api/v1/auth/me/password", "PATCH", { current_password: "old-example-password", new_password: "new-example-password" }],
    ]);
    for (const call of calls) assert.equal(call.credentials, "same-origin");
    for (const call of calls.slice(1, 6)) assert.equal(call.headers["X-CSRF-Token"], "csrf-example");
    for (const call of calls.slice(6)) assert.equal(call.cache, "no-store");
  } finally { globalThis.fetch = original; }
});

test("401 notifies auth and 403 preserves backend errors and CSRF recovery", async () => {
  const api = await import("../src/services/api.js?users-errors");
  const original = globalThis.fetch;
  let unauthorized = 0;
  const stop = api.onUnauthorized(() => { unauthorized += 1; });
  try {
    for (const [status, message, csrf] of [[401, "Não autenticado.", false], [403, "Acesso restrito a administradores.", false], [403, "Token CSRF inválido.", true], [409, "Não é permitido remover o último administrador ativo.", false]]) {
      globalThis.fetch = async () => ({ ok: false, status, json: async () => ({ error: message }) });
      await assert.rejects(api.getUsers(), (failure) => failure.status === status && failure.message === message && failure.isCsrf === csrf);
    }
    assert.equal(unauthorized, 1);
  } finally { stop(); globalThis.fetch = original; }
});

test("user edit status is sent with the single profile update contract", async () => {
  const api = await import("../src/services/api.js?user-edit-status");
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, json: async () => ({ csrf_token: "csrf", user: { id: 2, is_active: false } }) };
  };
  try {
    await api.updateUser(2, { full_name: "Changed", is_active: false, profile_ids: [2] });
    const writes = calls.filter((call) => call.path === "/api/v1/users/2");
    assert.equal(writes.length, 1);
    assert.deepEqual(JSON.parse(writes[0].options.body), { full_name: "Changed", is_active: false, profile_ids: [2] });
  } finally { globalThis.fetch = original; }
});


test("numeric date input inserts Brazilian separators for mobile keyboards", () => {
  assert.equal(maskBirthDate("29022000"), "29/02/2000");
  assert.equal(maskBirthDate("29/02/2000"), "29/02/2000");
  assert.equal(maskBirthDate("290"), "29/0");
  assert.equal(maskBirthDate("29"), "29");
  assert.equal(maskBirthDate(""), "");
});
