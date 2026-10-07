import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUserSearch, selectUsers, userProfileLabel } from "../src/features/users/state/userListQuery.js";

const users = Object.freeze([
  { id: 1, full_name: "Zélia Costa", email: "zelia@example.com", username: "zc", is_admin: false, is_active: true,
    profiles: [{ id: 2, name: "Recepção" }] },
  { id: 2, full_name: "  álvaro   Silva ", email: "ALVARO@example.com", username: "as", is_admin: true, is_active: false,
    profiles: [{ id: 1, name: "Administrador" }, { id: 2, name: "Recepção" }, { id: 3, name: "Financeiro" }] },
  { id: 3, full_name: "Ana Silva", email: "ana@example.com", username: "an", is_admin: false, is_active: false,
    profiles: [{ id: 3, name: "Financeiro" }] },
  { id: 4, full_name: "Érica Lima", email: "erica@example.com", username: "el", is_admin: true, is_active: true,
    profiles: [{ id: 1, name: "Administrador" }] },
  { id: 5, full_name: null, email: null, username: "legacy", is_admin: false, is_active: true, profiles: [] },
].map(Object.freeze));
const ids = (query) => selectUsers(users, query).map((user) => user.id);

test("search normalizes case, accents, surrounding and repeated whitespace", () => {
  assert.equal(normalizeUserSearch("  ÁLVARO \t SILVA \n"), "alvaro silva");
  assert.deepEqual(ids("  ALVARO   silva  "), [2]);
  assert.deepEqual(ids("  ana@EXAMPLE.com "), [3]);
  assert.deepEqual(ids(" ÉRICA "), [4]);
});

test("one, multiple and no profiles use API associations, not boolean roles", () => {
  assert.equal(userProfileLabel(users[0]), "Recepção");
  assert.equal(userProfileLabel(users[1]), "Administrador · Recepção · Financeiro");
  assert.equal(userProfileLabel(users[4]), "Sem perfil");
  assert.equal(userProfileLabel({ is_admin: true, profiles: [] }), "Sem perfil");
});

test("profile search matches any associated name with case and accent tolerance", () => {
  assert.deepEqual(ids("  ADMINISTRADOR  "), [2, 4]);
  assert.deepEqual(ids("recepcao"), [2, 1]);
  assert.deepEqual(ids("FINANCEIRO"), [2, 3]);
  assert.deepEqual(ids("USUÁRIO"), []);
  assert.deepEqual(ids("silva ADMINISTRADOR"), [2]);
});

test("results are A-Z in Portuguese regardless of API order and after filtering", () => {
  assert.deepEqual(ids(""), [2, 3, 4, 1, 5]);
  assert.deepEqual(selectUsers([...users].reverse()).map((user) => user.id), [2, 3, 4, 1, 5]);
  assert.deepEqual(ids("example.com"), [2, 3, 4, 1]);
  assert.deepEqual(ids("silva"), [2, 3]);
  assert.deepEqual(ids(" \t "), ids(""));
});

test("equal names have deterministic tie breaks independent of API order", () => {
  const sameNames = [
    { id: 3, full_name: "ÁNA", username: "z" },
    { id: 2, full_name: "ana", username: "a" },
    { id: 1, full_name: "Ana", username: "a" },
  ];
  assert.deepEqual(selectUsers(sameNames).map((user) => user.id), [1, 2, 3]);
  assert.deepEqual(selectUsers(sameNames.toReversed()).map((user) => user.id), [1, 2, 3]);
});

test("profile search keeps active and inactive users", () => {
  const result = selectUsers(users, "administrador");
  assert.deepEqual(result.map((user) => user.is_active), [false, true]);
});

test("empty results, legacy data and clearing the search are handled without mutation", () => {
  const before = JSON.stringify(users);
  assert.deepEqual(selectUsers([], "ana"), []);
  assert.deepEqual(ids("not-found"), []);
  assert.deepEqual(ids("legacy"), []); // Username is displayed, but is not a requested search field.
  assert.deepEqual(ids("sem perfil"), []);
  assert.deepEqual(ids(""), [2, 3, 4, 1, 5]);
  assert.equal(JSON.stringify(users), before);
  assert.notEqual(selectUsers(users), users);
});
