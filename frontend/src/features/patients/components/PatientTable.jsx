import Button from "../../../components/Button/Button";
import "../styles/PatientList.css";
import "../styles/PatientEdit.css";

export default function PatientTable({ patients, onEditPatient, canEdit, status }) {
  const { externalStatus, hasActions, statusError, updatingStatusId, changeStatus } = status;

  return (
    <div className="patient-list__table-wrapper" role="region" aria-labelledby="patients-title" tabIndex={0}>
      {statusError && <p className="patient-list__message patient-list__message--error" role="alert">{statusError}</p>}
      <table className="patient-list__table" aria-labelledby="patients-title">
        <caption>Lista de pacientes</caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">CPF</th>
            <th scope="col">Telefone</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
            {hasActions && <th scope="col">Ações</th>}
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
              {hasActions && <td data-label="Ações">
                <div className="patient-list__actions">
                  {canEdit && <Button className="patient-list__edit" variant="secondary" onClick={() => onEditPatient(patient)}>Editar</Button>}
                  {externalStatus && <Button className={`patient-edit__status-button patient-edit__status-button--${patient.is_active ? "inactive" : "active"}`}
                    variant="secondary" disabled={updatingStatusId !== null}
                    onClick={() => changeStatus(patient)}>
                    {patient.is_active ? "Inativar" : "Reativar"}
                  </Button>}
                </div>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
