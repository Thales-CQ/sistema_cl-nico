export function hasPatientsView(user) {
  return user?.permissions?.includes("patients.view") ?? false;
}

export function runDashboardRequest({ enabled, request, onSuccess, onFailure, onForbidden }) {
  if (!enabled) return () => {};
  let active = true;
  request().then(
    (result) => { if (active) onSuccess(result); },
    (failure) => {
      if (!active) return;
      if (!onForbidden(failure)) onFailure(failure);
    },
  );
  return () => { active = false; };
}

export function handlePatientAccessDenied(failure, { denyAccess, clearData, syncSession }) {
  if (failure?.status !== 403 || failure.isCsrf) return false;
  denyAccess();
  clearData();
  syncSession();
  return true;
}
