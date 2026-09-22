import { useState } from "react";
import ProfileCreate from "./ProfileCreate/ProfileCreate";
import ProfileList from "./ProfileList/ProfileList";
import ProfileEdit from "./ProfileEdit/ProfileEdit";
import "./Profiles.css";

export default function Profiles({ view = "consultar", onViewChange }) {
  const creating = view === "cadastrar";
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [reload, setReload] = useState(0);
  const editing = !creating && editingId !== null;

  function handleSaved(wasEditing = false) {
    setEditingId(null);
    setReload((current) => current + 1);
    setMessage(wasEditing ? "Perfil atualizado com sucesso." : "Perfil cadastrado com sucesso.");
    onViewChange("consultar");
  }

  return <section className="module-shell profiles" aria-labelledby="profiles-title">
    <nav className="module-sidebar" aria-labelledby="profiles-nav-title">
      <h2 id="profiles-nav-title">Perfis</h2>
      <ul>
        <li><a href="#/perfis/consultar" aria-current={!creating ? "page" : undefined}
          onClick={() => setEditingId(null)}>Consultar</a></li>
        <li><a href="#/perfis/cadastrar" aria-current={creating ? "page" : undefined}
          onClick={() => { setEditingId(null); setMessage(""); }}>Cadastrar</a></li>
      </ul>
    </nav>
    <div className={`profiles__content${creating || editing ? " profiles__content--creating" : " profiles__content--listing"}`}>
      {creating || editing ? <>
        <h2 id="profiles-title">{editing ? "Editar perfil" : "Cadastrar perfil"}</h2>
        {editing ? <ProfileEdit key={editingId} profileId={editingId}
          onSaved={() => handleSaved(true)} onCancel={() => setEditingId(null)} />
          : <ProfileCreate onSaved={() => handleSaved()} onCancel={() => onViewChange("consultar")} />}
      </> : <>
        {message && <p className="profiles__success" role="status">{message}</p>}
        <ProfileList key={reload} onEdit={(id) => { setMessage(""); setEditingId(id); }} />
      </>}
    </div>
  </section>;
}
