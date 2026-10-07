export function userEditCapabilities(hasPermission) {
  const canUpdateData = hasPermission("users.update");
  const canAssignProfiles = hasPermission("users.assign_profiles");
  const canResetPassword = hasPermission("users.reset_password");
  return {
    canUpdateData,
    canAssignProfiles,
    canResetPassword,
    canChangeStatus: hasPermission("users.change_status"),
    canOpenEdit: canUpdateData || canAssignProfiles || canResetPassword,
  };
}
