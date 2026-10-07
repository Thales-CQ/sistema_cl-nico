import "../styles/Users.css";

export default function Users({
  creating, editing, hasCreatePermission, hasViewPermission,
  onResetEdit, onClearMessage, children,
}) {
  return <section className="module-shell users" aria-labelledby="users-title">
    <nav className="module-sidebar users__sidebar" aria-labelledby="users-nav-title">
      <h2 id="users-nav-title">Usuários</h2>
      <ul>
        {hasViewPermission && <li><a href="#/usuarios/consultar" aria-current={!creating ? "page" : undefined}
          onClick={(event) => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            onResetEdit();
            onClearMessage();
          }}>Consultar</a></li>}
        {hasCreatePermission && <li><a href="#/usuarios/cadastrar" aria-current={creating ? "page" : undefined}>Cadastrar</a></li>}
      </ul>
    </nav>
    <div className="users__content">
      {(creating || editing) && <header className="users__header">
        <h2 id="users-title">{creating ? "Novo usuário" : "Editar usuário"}</h2>
      </header>}
      {children}
    </div>
  </section>;
}
