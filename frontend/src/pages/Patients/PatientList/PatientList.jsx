import Button from "../../../components/Button/Button";
import "./PatientList.css";

export default function PatientList({
  patients,
  loading,
  error,
  page,
  total,
  perPage,
  search = "",
  onSearchChange,
  onPageChange,
  onEditPatient = () => {},
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <header className="patients__header patient-list__header">
        <span id="patients-title" className="patients__accessible-title">Consulta de pacientes</span>
        <label className="patient-list__search patients__search">
          <svg className="patient-list__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 5 5" />
          </svg>
          <span className="patient-list__search-label">Pesquisar paciente</span>
          <input
            type="search"
            value={search}
            placeholder="Pesquisar paciente"
            onChange={onSearchChange}
          />
        </label>
      </header>
      <div className="patient-list__toolbar">
        <span className="patient-list__count" role="status" aria-atomic="true">
          {loading ? "Atualizando resultados..." : error ? "Resultados indisponíveis" : (
            `${total} ${total === 1 ? "resultado" : "resultados"}`
          )}
        </span>
      </div>
      <div className="patient-list__results" aria-busy={loading}>
        {loading ? (
          <p className="patient-list__message" role="status">Carregando pacientes...</p>
        ) : error ? (
          <p className="patient-list__message patient-list__message--error" role="alert">{error}</p>
        ) : total === 0 ? (
          <p className="patient-list__message" role="status">
            {search.trim() ? "Nenhum paciente corresponde à pesquisa." : "Nenhum paciente encontrado."}
          </p>
        ) : null}
        {patients.length > 0 && (
          <div className={loading || error ? "patient-list__results-content patient-list__results-content--hidden" : "patient-list__results-content"}>
            <PatientTable patients={patients} onEditPatient={onEditPatient} />
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <nav className="patient-list__pagination" aria-label="Paginação de pacientes">
          <Button
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="patient-list__count" role="status" aria-atomic="true">
            {loading ? "Atualizando página..." : `Página ${page} de ${totalPages}`}
          </span>
          <Button
            variant="secondary"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}
    </>
  );
}

function PatientTable({
  patients,
  onEditPatient,
}) {
  return (
    <div className="patient-list__table-wrapper" role="region" aria-labelledby="patients-title" tabIndex={0}>
      <table className="patient-list__table" aria-labelledby="patients-title">
        <caption>Lista de pacientes</caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">CPF</th>
            <th scope="col">Telefone</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td data-label="Nome"><span className="patient-list__name">{patient.full_name}</span></td>
              <td data-label="CPF">{patient.cpf || "—"}</td>
              <td data-label="Telefone">{patient.phone || "—"}</td>
              <td data-label="Email">{patient.email || "—"}</td>
              <td data-label="Status">
                <span className={`patient-list__status ${patient.is_active ? "patient-list__status--active" : "patient-list__status--inactive"}`}>
                  {patient.is_active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td data-label="Ações">
                <PatientActions
                  patient={patient}
                  onEditPatient={onEditPatient}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PatientActions({
  patient,
  onEditPatient,
}) {
  return (
    <div className="patient-list__actions">
      <Button
        className="patient-list__edit"
        variant="secondary"
        onClick={() => onEditPatient(patient)}
      >
        Editar
      </Button>
    </div>
  );
}
