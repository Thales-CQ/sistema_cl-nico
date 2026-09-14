const API_URL = "/api/v1";
let csrfToken = null;
let sessionCheck = null;
let authQueue = Promise.resolve();

function enqueueAuth(task) {
  const result = authQueue.then(task);
  authQueue = result.catch(() => {});
  return result;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Resposta inesperada do servidor. Tente novamente.");
  }
  if (typeof data?.csrf_token === "string") csrfToken = data.csrf_token;
  return { response, data };
}

function apiError(response, data) {
  const error = new Error(data?.error || "Não foi possível concluir a operação.");
  error.status = response.status;
  error.isCsrf = response.status === 403 && data?.error === "Token CSRF inválido.";
  if (data?.errors && typeof data.errors === "object") {
    error.errors = data.errors;
  }
  return error;
}

async function readSession() {
  const { response, data } = await request("/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw apiError(response, data);
  return data.user;
}

export function getSession() {
  // StrictMode subscribers share one in-flight check; auth requests are ordered.
  if (!sessionCheck) {
    sessionCheck = enqueueAuth(readSession).finally(() => {
      sessionCheck = null;
    });
  }
  return sessionCheck;
}

function postAuth(path, body) {
  return enqueueAuth(async () => {
    if (!csrfToken) await readSession();
    const { response, data } = await request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) throw apiError(response, data);
    return data;
  });
}

export function login(username, password) {
  return postAuth("/auth/login", { username, password });
}

export function logout() {
  return postAuth("/auth/logout");
}

export async function healthCheck() {
  const { response, data } = await request("/health");
  if (!response.ok) throw apiError(response, data);
  return data;
}

export async function getPatients() {
  const { response, data } = await request("/patients?page=1&per_page=100");
  if (!response.ok) throw apiError(response, data);
  return data;
}

export async function createPatient(payload) {
  if (!csrfToken) await readSession();
  const { response, data } = await request("/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw apiError(response, data);
  return data;
}
