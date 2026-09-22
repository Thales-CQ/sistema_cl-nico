export function displayUserName(user) {
  return user?.full_name?.trim() || user?.username?.trim() || "";
}
