import { useEffect, useMemo, useRef, useState } from "react";
import { getProfiles } from "../../../services/api";

export default function useProfileList({ initialProfiles = [], initialLoading = true }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const searchInput = useRef(null);
  const visibleProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return profiles.filter((profile) => profile.name.toLocaleLowerCase("pt-BR").includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [profiles, search]);

  useEffect(() => {
    searchInput.current?.focus();
    let active = true;
    getProfiles().then(
      (data) => { if (active) setProfiles(data.profiles); },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  function handleRetry() {
    setLoading(true);
    setError("");
    setRetry((value) => value + 1);
  }

  return {
    error,
    handleRetry,
    loading,
    onSearchChange: (event) => setSearch(event.target.value),
    search,
    searchInput,
    visibleProfiles,
  };
}
