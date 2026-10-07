import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

async function loadDashboardModule() {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/clinica-vite-tests",
  });
  const [module, { AuthContext }] = await Promise.all([
    vite.ssrLoadModule("/src/pages/Dashboard/Dashboard.jsx"),
    vite.ssrLoadModule("/src/contexts/AuthContext.js"),
  ]);
  return { AuthContext, vite, module };
}

test("dashboard sem patients.view não faz chamadas nem mostra widgets ou retries", async () => {
  const { AuthContext, vite, module } = await loadDashboardModule();
  const { default: Dashboard } = module;
  const { hasPatientsView, runDashboardRequest } = await vite.ssrLoadModule("/src/pages/Dashboard/dashboardAccess.js");
  let requests = 0;
  try {
    runDashboardRequest({
      enabled: hasPatientsView({ permissions: [] }),
      request() { requests += 1; return Promise.resolve({}); },
      onSuccess() {}, onFailure() {}, onForbidden() {},
    });
    const html = renderToStaticMarkup(createElement(
      AuthContext.Provider,
      { value: { refreshSession() {} } },
      createElement(Dashboard, { user: { permissions: [] } }),
    ));

    assert.equal(requests, 0);
    assert.match(html, /Acesso restrito aos dados de pacientes\./);
    assert.doesNotMatch(html, /Total de pacientes|Aniversariantes de hoje|Tentar carregar/);
  } finally {
    await vite.close();
  }
});

test("dashboard autorizado mantém widgets independentes e permite retry isolado", async () => {
  const { vite, module } = await loadDashboardModule();
  const { hasPatientsView, runDashboardRequest } = await vite.ssrLoadModule("/src/pages/Dashboard/dashboardAccess.js");
  const requests = { count: 0, birthdays: 0 };
  const outcomes = [];
  let resolveBirthdays;
  const birthdaysRequest = new Promise((resolve) => { resolveBirthdays = resolve; });
  try {
    const enabled = hasPatientsView({ permissions: ["patients.view"] });
    runDashboardRequest({
      enabled,
      request() { requests.count += 1; return Promise.reject(new Error("falha no total")); },
      onSuccess: (value) => outcomes.push(["count", value]),
      onFailure: (failure) => outcomes.push(["count-error", failure.message]),
      onForbidden() { return false; },
    });
    runDashboardRequest({
      enabled,
      request() { requests.birthdays += 1; return birthdaysRequest; },
      onSuccess: (value) => outcomes.push(["birthdays", value]),
      onFailure: (failure) => outcomes.push(["birthdays-error", failure.message]),
      onForbidden() { return false; },
    });
    await Promise.resolve();
    assert.deepEqual(outcomes, [["count-error", "falha no total"]]);
    resolveBirthdays({ patients: [{ id: 4, full_name: "Paciente autorizado" }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(outcomes[1], ["birthdays", { patients: [{ id: 4, full_name: "Paciente autorizado" }] }]);

    runDashboardRequest({
      enabled,
      request() { requests.count += 1; return Promise.resolve({ total: 3 }); },
      onSuccess: (value) => outcomes.push(["count-retry", value]),
      onFailure: (failure) => outcomes.push(["count-error", failure.message]),
      onForbidden() { return false; },
    });
    await Promise.resolve();
    assert.deepEqual(requests, { count: 2, birthdays: 1 });
    assert.deepEqual(outcomes.at(-1), ["count-retry", { total: 3 }]);
  } finally {
    await vite.close();
  }
});

test("dashboard limpa os dados restritos e sincroniza a sessão após 403", async () => {
  const { AuthContext, vite, module } = await loadDashboardModule();
  const { default: Dashboard } = module;
  const { handlePatientAccessDenied, runDashboardRequest } = await vite.ssrLoadModule("/src/pages/Dashboard/dashboardAccess.js");
  let restrictedData = { total: 8, patients: [{ full_name: "Paciente restrito" }] };
  let denied = false;
  let refreshes = 0;
  try {
    let handled = false;
    runDashboardRequest({
      enabled: true,
      request: () => Promise.reject({ status: 403, isCsrf: false }),
      onSuccess() {}, onFailure() {},
      onForbidden(failure) {
        handled = handlePatientAccessDenied(failure, {
          denyAccess() { denied = true; },
          clearData() { restrictedData = { total: null, patients: [] }; },
          syncSession() { refreshes += 1; },
        });
        return handled;
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    const html = renderToStaticMarkup(createElement(
      AuthContext.Provider,
      { value: { refreshSession() { refreshes += 1; } } },
      createElement(Dashboard, { user: { permissions: [] } }),
    ));

    assert.equal(handled, true);
    assert.equal(denied, true);
    assert.deepEqual(restrictedData, { total: null, patients: [] });
    assert.equal(refreshes, 1);
    assert.doesNotMatch(html, /Paciente restrito|>8</);
    assert.match(html, /Acesso restrito aos dados de pacientes\./);
  } finally {
    await vite.close();
  }
});
