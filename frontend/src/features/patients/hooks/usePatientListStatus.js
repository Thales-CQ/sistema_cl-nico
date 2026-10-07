import { useState } from "react";
import { updatePatientStatus } from "../../../services/api";

export default function usePatientListStatus({
  onStatusUpdated = () => {},
  canEdit = false,
  canChangeStatus = false,
}) {
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusError, setStatusError] = useState("");

  async function changeStatus(patient) {
    if (updatingStatusId !== null) return;
    const action = patient.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o paciente ${patient.full_name}?`)) return;
    setUpdatingStatusId(patient.id);
    setStatusError("");
    try {
      const data = await updatePatientStatus(patient.id, !patient.is_active);
      onStatusUpdated(data.patient);
    } catch (failure) {
      setStatusError(failure.message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const externalStatus = canChangeStatus && !canEdit;
  const hasActions = canEdit || externalStatus;

  return { changeStatus, externalStatus, hasActions, statusError, updatingStatusId };
}
