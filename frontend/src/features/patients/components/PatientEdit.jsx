import Button from "../../../components/Button/Button";
import "../styles/PatientEdit.css";

export default function PatientEdit({
  loading,
  error,
  patient,
  statusError,
  onCancel,
  form,
}) {
  if (loading) {
    return <p className="patient-edit__message" role="status">Carregando paciente...</p>;
  }

  if (error) {
    return (
      <div className="patient-edit__message patient-edit__message--error" role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={onCancel}>Voltar</Button>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="patient-edit">
      {statusError && <p className="patient-edit__status-error" role="alert">{statusError}</p>}
      {form}
    </div>
  );
}
