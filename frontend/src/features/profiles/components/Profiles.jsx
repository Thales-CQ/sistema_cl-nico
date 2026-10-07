import "../styles/Profiles.css";

export default function Profiles({
  creating, editing, canView, canCreate, onResetEditing, onClearMessage, children,
}) {
  return <section className="module-shell profiles" aria-labelledby="profiles-title">
    <nav className="module-sidebar" aria-labelledby="profiles-nav-title">
      <h2 id="profiles-nav-title">Perfis</h2>
      <ul>
        {canView && <li><a href="#/perfis/consultar" aria-current={!creating ? "page" : undefined}
          onClick={() => onResetEditing()}>Consultar</a></li>}
        {canCreate && <li><a href="#/perfis/cadastrar" aria-current={creating ? "page" : undefined}
          onClick={() => { onResetEditing(); onClearMessage(); }}>Cadastrar</a></li>}
      </ul>
    </nav>
    <div className={`profiles__content${creating || editing ? " profiles__content--creating" : " profiles__content--listing"}`}>
      {(creating || editing) && <h2 id="profiles-title">{editing ? "Editar perfil" : "Cadastrar perfil"}</h2>}
      {children}
    </div>
  </section>;
}
