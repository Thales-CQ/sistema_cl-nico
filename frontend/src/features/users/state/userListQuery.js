const nameCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function normalizeUserSearch(value = "") {
  return String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR").trim().replace(/\s+/gu, " ");
}

export function userProfileLabel(user) {
  return user.profiles?.length ? user.profiles.map((profile) => profile.name).join(" · ") : "Sem perfil";
}

export function selectUsers(users, search = "") {
  const terms = normalizeUserSearch(search).split(" ").filter(Boolean);
  return users.filter((user) => {
    const fields = [user.full_name, user.email, ...(user.profiles ?? []).map((profile) => profile.name)]
      .map(normalizeUserSearch);
    return terms.every((term) => fields.some((field) => field.includes(term)));
  }).sort((a, b) => {
    const aName = normalizeUserSearch(a.full_name);
    const bName = normalizeUserSearch(b.full_name);
    // Legacy users without a full name follow the named users.
    if (!aName !== !bName) return aName ? -1 : 1;
    return nameCollator.compare(aName, bName)
      || nameCollator.compare(a.username ?? "", b.username ?? "")
      || a.id - b.id;
  });
}
