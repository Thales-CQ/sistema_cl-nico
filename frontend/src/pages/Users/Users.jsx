import { useCallback, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import UserList from "./UserList/UserList";
import UserCreate from "./UserCreate/UserCreate";
import UserEdit from "./UserEdit/UserEdit";
import "./Users.css";

export default function Users({ view = "consultar", onViewChange }) {
  const { user, reconcileUser, refreshSession } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState("");
  const [denied, setDenied] = useState(false);
  const creating = view === "cadastrar";

  const handleFailure = useCallback((failure) => {
    if (failure.status === 403 && !failure.isCsrf) {
      setDenied(true);
      // Recheck a privilege revoked from another session. Hide the local data
      // immediately, even if the subsequent session check cannot reach the API.
      refreshSession();
    }
  }, [refreshSession]);

  function saved(savedUser) {
    reconcileUser(savedUser);
    setEditingId(null);
    setReload((current) => current + 1);
    setMessage(creating ? "Usuário cadastrado com sucesso." : "Usuário atualizado com sucesso.");
    onViewChange("consultar");
  }

  if (user?.is_admin !== true || denied) return <p role="alert" className="users__error">Acesso restrito a administradores.</p>;

  return <section className="module-shell users" aria-labelledby="users-title">
    <nav className="module-sidebar users__sidebar" aria-labelledby="users-nav-title">
      <h2 id="users-nav-title">Usuários</h2>
      <ul>
        <li><a href="#/usuarios/consultar" aria-current={!creating ? "page" : undefined}
          onClick={(event) => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            setEditingId(null);
            setMessage("");
          }}>Consultar</a></li>
        <li><a href="#/usuarios/cadastrar" aria-current={creating ? "page" : undefined}>Cadastrar</a></li>
      </ul>
    </nav>
    <div className="users__content">
      {(creating || editingId !== null) && <header className="users__header">
        <h2 id="users-title">{creating ? "Novo usuário" : "Editar usuário"}</h2>
      </header>}
      {message && <p className="users__success" role="status">{message}</p>}
      {creating ? <UserCreate onSaved={saved} onFailure={handleFailure} onCancel={() => onViewChange("consultar")} /> :
        editingId !== null ? <UserEdit key={editingId} userId={editingId} onSaved={saved}
        onFailure={handleFailure} onCancel={() => setEditingId(null)} /> :
          <UserList key={reload} onFailure={handleFailure} onRetry={() => setReload((current) => current + 1)}
            onEdit={(id) => { setMessage(""); setEditingId(id); }} />}
    </div>
  </section>;
}
