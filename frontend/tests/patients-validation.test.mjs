import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { canAccessDestination, resolveDestination } from "../src/routes/navigation.js";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("patient search API preserves page size, query normalization and request options", async () => {
  const api = await import("../src/services/api.js?patient-validation-search");
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return response(200, { patients: [], total: 0 });
  };
  try {
    await api.getPatients(3, 20, "  Ana Silva  ");
    await api.getPatients(1, 20, "   ");
    assert.equal(calls[0].path, "/api/v1/patients?page=3&per_page=20&search=Ana+Silva");
    assert.equal(calls[1].path, "/api/v1/patients?page=1&per_page=20");
    assert.deepEqual(calls.map(({ options }) => options.credentials), ["same-origin", "same-origin"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("patient create, edit and status API payloads preserve their contracts and CSRF", async () => {
  const api = await import("../src/services/api.js?patient-validation-writes");
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.endsWith("/auth/me")) return response(200, { csrf_token: "patient-csrf", user: { id: 1 } });
    if (path.endsWith("/status")) return response(200, { patient: { id: 7, is_active: false } });
    return response(200, { patient: { id: 7, full_name: "Ana Silva", is_active: true } });
  };
  try {
    const createPayload = {
      full_name: "Ana Silva", birth_date: "2000-02-29", sex: "F", cpf: null,
      phone: "11999999999", email: null,
    };
    const editPayload = { ...createPayload, email: "ana@example.com" };
    await api.createPatient(createPayload);
    await api.updatePatient(7, editPayload);
    await api.updatePatientStatus(7, false);

    assert.deepEqual(calls.slice(1).map(({ path, options }) => [
      path, options.method, JSON.parse(options.body), options.headers["X-CSRF-Token"], options.credentials,
    ]), [
      ["/api/v1/patients", "POST", createPayload, "patient-csrf", "same-origin"],
      ["/api/v1/patients/7", "PATCH", editPayload, "patient-csrf", "same-origin"],
      ["/api/v1/patients/7/status", "PATCH", { is_active: false }, "patient-csrf", "same-origin"],
    ]);
    assert.equal(calls[0].path, "/api/v1/auth/me");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("patient edit saves data and status together when status permission is available", async () => {
  const featureSource = await readFile(
    new URL("../src/features/patients/PatientEditFeature.jsx", import.meta.url),
    "utf8",
  );
  assert.match(featureSource, /<PatientFormFeature[\s\S]*?canChangeStatus=\{canChangeStatus\}/);

  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  const calls = [];
  const originalFetch = globalThis.fetch;
  let submit;
  let updatedPatient;
  const originalPatient = {
    id: 7,
    full_name: "Ana Silva",
    birth_date: "2000-02-29",
    sex: "F",
    cpf: null,
    phone: null,
    email: null,
    is_active: true,
  };
  const editedPatient = { ...originalPatient, is_active: false };
  globalThis.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.endsWith("/auth/me")) {
      return response(200, { csrf_token: "patient-edit-csrf", user: { id: 1 } });
    }
    return response(200, { patient: {
      id: 7,
      full_name: "ANA SILVA",
      birth_date: "2000-02-29",
      sex: "F",
      cpf: null,
      phone: null,
      email: null,
      is_active: false,
    } });
  };
  try {
    const { default: usePatientForm } = await vite.ssrLoadModule(
      "/src/features/patients/hooks/usePatientForm.js",
    );
    function SubmitHarness() {
      const form = usePatientForm({
        patient: editedPatient,
        mode: "edit",
        canChangeStatus: true,
        onUpdated(patient) { updatedPatient = patient; },
      });
      submit = form.handleSubmit;
      return null;
    }

    renderToStaticMarkup(createElement(SubmitHarness));
    await submit({ preventDefault() {} });

    const writes = calls.filter(({ options }) => options.method === "PATCH");
    assert.equal(originalPatient.is_active, true);
    assert.equal(editedPatient.is_active, false);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "/api/v1/patients/7");
    assert.deepEqual(JSON.parse(writes[0].options.body), {
      full_name: "Ana Silva",
      birth_date: "2000-02-29",
      sex: "F",
      cpf: null,
      phone: null,
      email: null,
      is_active: false,
    });
    assert.equal(updatedPatient.is_active, false);
    assert.equal(calls.some(({ path }) => path.endsWith("/status")), false);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test("patient-by-ID lookup and validation/duplicate-CPF API errors remain observable", async () => {
  const api = await import("../src/services/api.js?patient-validation-errors");
  const originalFetch = globalThis.fetch;
  const calls = [];
  let createCalls = 0;
  globalThis.fetch = async (path) => {
    calls.push(path);
    if (path.endsWith("/patients/7")) return response(200, { patient: { id: 7, full_name: "Ana Silva" } });
    createCalls += 1;
    if (createCalls === 1) return response(422, { error: "Dados inválidos.", errors: { full_name: "Informe o nome." } });
    return response(409, { error: "CPF já cadastrado." });
  };
  try {
    assert.deepEqual(await api.getPatient(7), { patient: { id: 7, full_name: "Ana Silva" } });
    assert.equal(calls[0], "/api/v1/patients/7");
    await assert.rejects(api.createPatient({}), (error) => (
      error.status === 422 && error.message === "Dados inválidos."
      && error.errors.full_name === "Informe o nome."
    ));
    await assert.rejects(api.createPatient({ cpf: "123" }), (error) => (
      error.status === 409 && error.message === "CPF já cadastrado."
    ));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("patient list renders current loading, error, empty and pagination states", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  try {
    const { default: PatientList } = await vite.ssrLoadModule("/src/features/patients/components/PatientList.jsx");
    const render = (props) => renderToStaticMarkup(createElement(PatientList, {
      patients: [], page: 1, total: 0, perPage: 20, onSearchChange() {}, onPageChange() {},
      ...props,
    }));
    const loading = render({ loading: true });
    assert.match(loading, /Carregando pacientes/);
    assert.match(loading, /aria-busy="true"/);
    const failed = render({ loading: false, error: "Falha ao consultar pacientes." });
    assert.match(failed, /role="alert"/);
    assert.match(failed, /Falha ao consultar pacientes/);
    const emptySearch = render({ loading: false, error: "", search: "Ana", total: 0 });
    assert.match(emptySearch, /Nenhum paciente corresponde à pesquisa/);
    const paged = render({ loading: false, error: "", total: 41, page: 1 });
    assert.match(paged, /Página 1 de 3/);
    assert.match(paged, /disabled=""[^>]*>Anterior/);
  } finally {
    await vite.close();
  }
});

test("patient edit loading/error and form saving states render accessibly", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  try {
    const [{ default: PatientEdit }, { default: PatientForm }] = await Promise.all([
      vite.ssrLoadModule("/src/features/patients/components/PatientEdit.jsx"),
      vite.ssrLoadModule("/src/features/patients/components/PatientForm.jsx"),
    ]);
    const loading = renderToStaticMarkup(createElement(PatientEdit, { loading: true }));
    assert.match(loading, /Carregando paciente/);
    const error = renderToStaticMarkup(createElement(PatientEdit, {
      loading: false, error: "Paciente não encontrado.", onCancel() {},
    }));
    assert.match(error, /role="alert"/);
    assert.match(error, /Paciente não encontrado/);
    const form = {
      birthDate: "", cpf: "", editing: true, email: "", fieldErrors: {}, fullName: "Ana Silva",
      handleSubmit() {}, nameInput: { current: null }, phone: "", saveError: "", saving: true,
      setBirthDate() {}, setCpf() {}, setEmail() {}, setFullName() {}, setPhone() {}, setSex() {}, sex: "F",
    };
    const saving = renderToStaticMarkup(createElement(PatientForm, { form: {
      ...form,
      setBirthDate(value) {}, setCpf(value) {}, setEmail(value) {}, setFullName(value) {},
      setPhone(value) {}, setSex(value) {},
    }, onCancel() {} }));
    assert.match(saving, /Atualizando/);
    assert.match(saving, /disabled=""/);
  } finally {
    await vite.close();
  }
});

test("patient list status actions and module links follow existing permission flags", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  try {
    const [{ default: PatientListFeature }, { default: Patients }, { AuthContext }] = await Promise.all([
      vite.ssrLoadModule("/src/features/patients/PatientListFeature.jsx"),
      vite.ssrLoadModule("/src/features/patients/components/Patients.jsx"),
      vite.ssrLoadModule("/src/contexts/AuthContext.js"),
    ]);
    const patient = { id: 7, full_name: "Ana Silva", is_active: true };
    const list = (canEdit, canChangeStatus) => renderToStaticMarkup(createElement(PatientListFeature, {
      patients: [patient], loading: false, total: 1, page: 1, perPage: 20,
      canEdit, canChangeStatus, onEditPatient() {}, onStatusUpdated() {},
    }));
    assert.doesNotMatch(list(false, false), />Ações|>Editar|>Inativar/);
    assert.match(list(true, false), />Editar/);
    assert.doesNotMatch(list(true, false), />Inativar/);
    assert.match(list(false, true), />Inativar/);
    assert.doesNotMatch(list(false, true), />Editar/);

    const nav = (permissions) => renderToStaticMarkup(createElement(AuthContext.Provider, {
      value: { hasPermission: (code) => permissions.includes(code) },
    }, createElement(Patients, {
      creating: false, editing: false,
      hasCreatePermission: permissions.includes("patients.create"),
      hasViewPermission: permissions.includes("patients.view"),
      onResetEdit() {}, onClearError() {},
    })));
    assert.match(nav(["patients.view"]), />Consultar/);
    assert.doesNotMatch(nav(["patients.view"]), />Cadastrar/);
    assert.match(nav(["patients.create"]), />Cadastrar/);
    assert.doesNotMatch(nav(["patients.create"]), />Consultar/);
    assert.equal(canAccessDestination(resolveDestination("#/pacientes/consultar"), { permissions: ["patients.create"] }), false);
    assert.equal(canAccessDestination(resolveDestination("#/pacientes/cadastrar"), { permissions: ["patients.create"] }), true);
  } finally {
    await vite.close();
  }
});
