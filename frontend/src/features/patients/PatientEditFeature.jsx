import PatientEdit from "./components/PatientEdit";
import PatientFormFeature from "./PatientFormFeature";
import usePatientEdit from "./hooks/usePatientEdit";
import Button from "../../components/Button/Button";

export default function PatientEditFeature({ patientId, onUpdated, onCancel, canChangeStatus = false }) {
  const edit = usePatientEdit({ patientId, onUpdated });
  const form = edit.patient && (
    <PatientEditFormFeature key={edit.patient.id} edit={edit} onCancel={onCancel} canChangeStatus={canChangeStatus} />
  );

  return (
    <PatientEdit
      loading={edit.loading}
      error={edit.error}
      patient={edit.patient}
      statusError={edit.statusError}
      onCancel={onCancel}
      form={form}
    />
  );
}

function PatientEditFormFeature({ edit, onCancel, canChangeStatus }) {
  const { patient, handlePatientUpdated, handleStatusChange } = edit;
  const statusAction = canChangeStatus ? <Button
    className={`patient-edit__status-button patient-edit__status-button--${patient.is_active ? "inactive" : "active"}`}
    type="button" variant="secondary" onClick={handleStatusChange}>
    {patient.is_active ? "Inativar" : "Reativar"}
  </Button> : null;

  return <PatientFormFeature
    patient={patient}
    mode="edit"
    canChangeStatus={canChangeStatus}
    onUpdated={handlePatientUpdated}
    onCancel={onCancel}
    extraActions={statusAction}
  />;
}
