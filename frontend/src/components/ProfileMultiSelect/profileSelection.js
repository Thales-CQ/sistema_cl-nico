export function toggleProfileId(selectedIds, profileId, checked) {
  return checked
    ? [...selectedIds.filter((id) => id !== profileId), profileId]
    : selectedIds.filter((id) => id !== profileId);
}
