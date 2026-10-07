export function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((permission) => typeof permission === "string");
}

export function normalizeUser(user, previousUser = null) {
  if (!user) return user;
  const permissions = user.permissions === undefined
    ? previousUser?.permissions
    : user.permissions;
  return { ...user, permissions: normalizePermissions(permissions) };
}

export async function loginWithSession(username, password, authApi) {
  await authApi.login(username, password);
  const sessionUser = await authApi.getSession();
  if (!sessionUser) {
    const error = new Error("Não foi possível validar a sessão após o login.");
    error.status = 503;
    throw error;
  }
  return sessionUser;
}

export function hasPermission(user, code) {
  return typeof code === "string"
    && normalizePermissions(user?.permissions).includes(code);
}
