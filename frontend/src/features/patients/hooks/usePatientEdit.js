import { useEffect, useState } from "react";
import { getPatient, updatePatientStatus } from "../../../services/api";

export default function usePatientEdit({ patientId, onUpdated }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");

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
    const action = patient.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o paciente ${patient.full_name}?`)) return;
    setStatusError("");
    setPatient((current) => ({ ...current, is_active: !current.is_active }));
  }

  async function handlePatientUpdated(updatedPatient) {
    if (updatedPatient.is_active !== patient.is_active) {
      try {
        const status = await updatePatientStatus(patient.id, updatedPatient.is_active);
        setPatient(status.patient);
        onUpdated(status.patient);
      } catch (failure) {
        setStatusError(failure.message);
        throw failure;
      }
      return;
    }
    setPatient(updatedPatient);
    onUpdated(updatedPatient);
  }

  return {
    error,
    handlePatientUpdated,
    handleStatusChange,
    loading,
    patient,
    statusError,
  };
}
