import { useEffect, useState } from "react";
import Button from "../../../components/Button/Button";
import { getPatient } from "../../../services/api";
import PatientCreate from "../PatientCreate/PatientCreate";
import "./PatientEdit.css";

export default function PatientEdit({
  patientId,
  onUpdated,
  onCancel,
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPatient(patientId).then(
      (data) => {
        if (!active) return;
        setPatient(data.patient);
      },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [patientId]);

  function handleStatusChange() {
    if (!patient) return;

    const nextStatus = !patient.is_active;
    const action = nextStatus ? "reativar" : "inativar";
    if (!window.confirm(`Deseja ${action} o paciente ${patient.full_name}?`)) return;

    setPatient((current) => ({ ...current, is_active: nextStatus }));
  }

  function handleCancel() {
    onCancel();
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
      onClick={handleStatusChange}
    >
      {patient.is_active ? "Inativar" : "Reativar"}
    </Button>
  );

  return (
    <div className="patient-edit">
      <PatientCreate
        key={patient.id}
        patient={patient}
        mode="edit"
        onUpdated={(updatedPatient) => {
          setPatient(updatedPatient);
          onUpdated(updatedPatient);
        }}
        onCancel={handleCancel}
        extraActions={statusAction}
      />
    </div>
  );
}
