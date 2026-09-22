import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import { getProfiles } from "../../../services/api";

export default function ProfileList({ onEdit }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return <div className="profile-list">
    <header className="profile-list__header">
      <h2 id="profiles-title">Consultar perfis</h2>
      <label className="profile-list__search">
        <span className="profiles__sr-only">Pesquisar perfil</span>
        <input ref={searchInput} type="search" value={search} placeholder="Pesquisar perfil"
          onChange={(event) => setSearch(event.target.value)} />
      </label>
    </header>
    <p className="profile-list__count" role="status" aria-atomic="true">
      {loading ? "Atualizando resultados..." : error ? "Resultados indisponíveis" :
        `${visibleProfiles.length} ${visibleProfiles.length === 1 ? "resultado" : "resultados"}`}
    </p>
    <div className="profile-list__results" aria-busy={loading}>
      {loading ? <p role="status">Carregando perfis...</p> : error ? <div>
        <p className="profiles__error" role="alert">{error}</p>
        <Button variant="secondary" onClick={() => { setLoading(true); setError(""); setRetry((value) => value + 1); }}>
          Tentar novamente
        </Button>
      </div> : visibleProfiles.length === 0 ? <p role="status">
        {search.trim() ? "Nenhum perfil corresponde à pesquisa." : "Nenhum perfil encontrado."}
      </p> : <div className="profile-list__wrapper" role="region" aria-labelledby="profiles-title" tabIndex={0}>
        <table className="profile-list__table" aria-labelledby="profiles-title">
          <caption className="profiles__sr-only">Lista de perfis</caption>
          <thead><tr><th scope="col">Nome</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead>
          <tbody>{visibleProfiles.map((profile) => <tr key={profile.id}>
            <td data-label="Nome">{profile.name}</td>
            <td data-label="Status"><span className={`profile-list__status profile-list__status--${profile.is_active ? "active" : "inactive"}`}>
              {profile.is_active ? "Ativo" : "Inativo"}
            </span></td>
            <td data-label="Ações"><Button className="profile-list__edit" variant="secondary"
              aria-label={`Editar ${profile.name}`} onClick={() => onEdit(profile.id)}>Editar</Button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  </div>;
}
