export function activeProfiles(profiles) {
  return profiles.filter((profile) => profile.is_active);
}

export function hasSelectedProfile(selectedIds) {
  return selectedIds.length > 0;
}

export function editableProfiles(profiles, assignedProfiles) {
  const assignedIds = new Set(assignedProfiles.map((profile) => profile.id));
  const visible = profiles.filter((profile) => profile.is_active || assignedIds.has(profile.id));
  const visibleIds = new Set(visible.map((profile) => profile.id));
  return [...visible, ...assignedProfiles.filter((profile) => !visibleIds.has(profile.id))];
}
