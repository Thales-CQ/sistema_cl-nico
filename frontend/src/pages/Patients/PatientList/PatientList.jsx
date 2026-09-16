import { filterPatients } from "./patientSearch";
import Button from "../../../components/Button/Button";
import "./PatientList.css";

export default function PatientList({
  patients,
  loading,
  error,
  search = "",
  onEditPatient = () => {},
}) {
  const filteredPatients = filterPatients(patients, search);

  return (
    <>
      {loading ? (
        <p className="patient-list__message" role="status">Carregando pacientes...</p>
      ) : error ? (
        <p className="patient-list__message patient-list__message--error" role="alert">{error}</p>
      ) : patients.length === 0 ? (
        <p className="patient-list__message" role="status">Nenhum paciente encontrado.</p>
      ) : (
        <>
          <div className="patient-list__toolbar" aria-live="polite">
            <span className="patient-list__count" aria-live="polite">
              {filteredPatients.length} {filteredPatients.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
          {filteredPatients.length === 0 ? (
            <p className="patient-list__message" role="status">Nenhum paciente corresponde à pesquisa.</p>
          ) : (
            <PatientTable
              patients={filteredPatients}
              onEditPatient={onEditPatient}
            />
          )}
        </>
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
