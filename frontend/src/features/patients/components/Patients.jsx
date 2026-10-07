import "../styles/Patients.css";

export default function Patients({
  creating,
  editing,
  hasCreatePermission,
  hasViewPermission,
  onResetEdit,
  onClearError,
  children,
}) {
  return (
    <section className={`module-shell patients${creating ? " patients--creating" : ""}${editing ? " patients--editing" : ""}`} aria-labelledby="patients-title">
      <nav className="module-sidebar patients__sidebar" aria-labelledby="patients-nav-title">
        <h2 id="patients-nav-title">Pacientes</h2>
        <ul>
          {hasViewPermission && <li><a href="#/pacientes/consultar" aria-current={!creating ? "page" : undefined}
            onClick={() => { onResetEdit(); onClearError(); }}>Consultar</a></li>}
          {hasCreatePermission && <li><a href="#/pacientes/cadastrar" aria-current={creating ? "page" : undefined}
            onClick={() => { onResetEdit(); onClearError(); }}>Cadastrar</a></li>}
        </ul>
      </nav>
      <div className="patients__content">
        {(creating || editing) && (
          <header className="patients__header">
            <h2 id="patients-title">{creating ? "Novo paciente" : "Editar paciente"}</h2>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
