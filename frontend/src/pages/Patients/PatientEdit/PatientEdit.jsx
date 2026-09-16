import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import { getPatient, updatePatient, updatePatientStatus } from "../../../services/api";
import PatientCreate from "../PatientCreate/PatientCreate";
import "./PatientEdit.css";

export default function PatientEdit({
  patientId,
  onUpdated,
  onStatusUpdated,
  onCancel,
}) {
  const [patient, setPatient] = useState(null);
  const [originalPatient, setOriginalPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const originalPatientRef = useRef(null);
  const persistedPatientRef = useRef(null);

  useEffect(() => {
    let active = true;
    getPatient(patientId).then(
      (data) => {
        if (!active) return;
        originalPatientRef.current = data.patient;
        persistedPatientRef.current = data.patient;
        setPatient(data.patient);
        setOriginalPatient(data.patient);
      },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [patientId]);

  async function handleStatusChange() {
    if (!patient || statusUpdating || canceling) return;

    const nextStatus = !patient.is_active;
    const action = nextStatus ? "reativar" : "inativar";
    if (!window.confirm(`Deseja ${action} o paciente ${patient.full_name}?`)) return;

    setStatusUpdating(true);
    setStatusError("");
    try {
      const data = await updatePatientStatus(patient.id, nextStatus);
      persistedPatientRef.current = data.patient;
      setPatient(data.patient);
      onStatusUpdated(data.patient);
    } catch (failure) {
      setStatusError(failure.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleCancel() {
    const currentPatient = persistedPatientRef.current || patient;
    const initialPatient = originalPatientRef.current || originalPatient;
    if (!currentPatient || !initialPatient || statusUpdating || canceling) return;

    const editableFields = ["full_name", "birth_date", "sex", "cpf", "phone", "email"];
    const fieldsChanged = editableFields.some((field) => currentPatient[field] !== initialPatient[field]);
    const statusChanged = currentPatient.is_active !== initialPatient.is_active;
    if (!fieldsChanged && !statusChanged) {
      await onCancel();
      return;
    }

    setCanceling(true);
    setStatusError("");
    try {
      if (fieldsChanged) {
        await updatePatient(currentPatient.id, Object.fromEntries(
          editableFields.map((field) => [field, initialPatient[field]]),
        ));
      }
      if (statusChanged) {
        await updatePatientStatus(currentPatient.id, initialPatient.is_active);
      }
      await onCancel(initialPatient);
    } catch (failure) {
      setStatusError(`Não foi possível cancelar as alterações: ${failure.message}`);
    } finally {
      setCanceling(false);
    }
  }

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

  const statusAction = (
    <Button
      className={`patient-edit__status-button ${patient.is_active
        ? "patient-edit__status-button--inactive"
        : "patient-edit__status-button--active"}`}
      type="button"
      variant="secondary"
      disabled={statusUpdating || canceling}
      onClick={handleStatusChange}
    >
      {statusUpdating ? "Processando..." : (patient.is_active ? "Inativar" : "Reativar")}
    </Button>
  );

  return (
    <div className="patient-edit">
      {statusError && <p className="patient-edit__status-error" role="alert">{statusError}</p>}
      <PatientCreate
        key={patient.id}
        patient={patient}
        mode="edit"
        onUpdated={(updatedPatient) => {
          persistedPatientRef.current = updatedPatient;
          setPatient(updatedPatient);
          onUpdated(updatedPatient);
        }}
        onCancel={handleCancel}
        busy={statusUpdating || canceling}
        extraActions={statusAction}
      />
    </div>
  );
}
