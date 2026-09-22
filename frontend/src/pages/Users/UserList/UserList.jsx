import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import { getUsers } from "../../../services/api";
import { normalizeUserSearch, selectUsers, userProfileLabel } from "./userListQuery";
import "./UserList.css";

export default function UserList({ onEdit, onRetry, onFailure }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const searchInput = useRef(null);
  const normalizedSearch = normalizeUserSearch(search);
  const updating = loading || normalizedSearch !== appliedSearch;
  const visibleUsers = useMemo(() => selectUsers(users, appliedSearch), [users, appliedSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setAppliedSearch(normalizedSearch), 300);
    return () => clearTimeout(timeoutId);
  }, [normalizedSearch]);

  useEffect(() => {
    searchInput.current?.focus();
    let active = true;
    getUsers().then(
      (data) => { if (active) setUsers(data.users); },
      (failure) => {
        if (!active) return;
        setError(failure.message);
        onFailure(failure);
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onFailure]);

  return (
    <div className="user-list">
      <header className="users__header user-list__header">
        <span id="users-title" className="users__sr-only">Consulta de usuários</span>
        <label className="user-list__search">
          <svg className="user-list__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 5 5" />
          </svg>
          <span className="users__sr-only">Pesquisar usuário</span>
          <input ref={searchInput} type="search" value={search} placeholder="Pesquisar usuário"
            onChange={(event) => setSearch(event.target.value)} />
        </label>
      </header>
      <div className="user-list__toolbar">
        <span className="user-list__count" role="status" aria-atomic="true">
          {updating ? "Atualizando resultados..." : error ? "Resultados indisponíveis" : (
            `${visibleUsers.length} ${visibleUsers.length === 1 ? "resultado" : "resultados"}`
          )}
        </span>
      </div>
      <div className="user-list__results" aria-busy={updating}>
        {updating ? <p className="user-list__message" role="status">Carregando usuários...</p> : error ? (
          <div>
            <p className="user-list__message user-list__message--error" role="alert">{error}</p>
            <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>
          </div>
        ) : visibleUsers.length === 0 ? (
          <p className="user-list__message" role="status">
            {appliedSearch ? "Nenhum usuário corresponde à pesquisa." : "Nenhum usuário encontrado."}
          </p>
        ) : null}
        {visibleUsers.length > 0 && (
          <div className={`user-list__results-content${updating || error ? " user-list__results-content--hidden" : ""}`}>
            <div className="user-list__wrapper" role="region" aria-labelledby="users-title" tabIndex={0}>
              <table className="user-list__table" aria-labelledby="users-title">
                <caption className="users__sr-only">Lista de usuários</caption>
                <thead><tr>
                  <th scope="col">Nome completo</th><th scope="col">Username</th><th scope="col">E-mail</th>
                  <th scope="col">Status</th><th scope="col">Perfis</th><th scope="col">Ações</th>
                </tr></thead>
                <tbody>{visibleUsers.map((user) => <tr key={user.id}>
                  <td data-label="Nome completo"><span className="user-list__name">{user.full_name || "Não informado"}</span></td>
                  <td data-label="Username">{user.username}</td>
                  <td data-label="E-mail">{user.email || "Não informado"}</td>
                  <td data-label="Status"><span className={`user-list__status user-list__status--${user.is_active ? "active" : "inactive"}`}>
                    {user.is_active ? "Ativo" : "Inativo"}
                  </span></td>
                  <td data-label="Perfis"><span className={`user-list__profiles${user.profiles?.length ? "" : " user-list__profiles--empty"}`}>
                    {userProfileLabel(user)}
                  </span></td>
                  <td data-label="Ações"><div className="user-list__actions">
                    <Button className="user-list__edit" variant="secondary" onClick={() => onEdit(user.id)}
                      aria-label={`Editar ${user.full_name || user.username}`}>Editar</Button>
                  </div></td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
