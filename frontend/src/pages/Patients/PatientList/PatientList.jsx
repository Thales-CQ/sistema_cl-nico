import "./PatientList.css";

export default function PatientList({ patients, loading, error }) {
  return (
    <>
      {loading ? (
        <p className="patient-list__message" role="status">Carregando pacientes...</p>
      ) : error ? (
        <p className="patient-list__message patient-list__message--error" role="alert">{error}</p>
      ) : patients.length === 0 ? (
        <p className="patient-list__message" role="status">Nenhum paciente encontrado.</p>
      ) : (
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
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td data-label="Nome">{patient.full_name}</td>
                  <td data-label="CPF">{patient.cpf || "—"}</td>
                  <td data-label="Telefone">{patient.phone || "—"}</td>
                  <td data-label="Email">{patient.email || "—"}</td>
                  <td data-label="Status">{patient.is_active ? "Ativo" : "Inativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
