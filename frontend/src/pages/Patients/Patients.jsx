import { useEffect, useRef, useState } from "react";
import Button from "../../components/Button/Button";
import { getPatients } from "../../services/api";
import PatientCreate from "./PatientCreate/PatientCreate";
import PatientList from "./PatientList/PatientList";
import "./Patients.css";

export default function Patients({ view = "consultar", onViewChange }) {
  const creating = view === "cadastrar";
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const newPatientButton = useRef(null);
  const wasCreating = useRef(false);

  useEffect(() => {
    if (!creating && wasCreating.current) newPatientButton.current?.focus();
    wasCreating.current = creating;
  }, [creating]);

  useEffect(() => {
    let active = true;
    getPatients().then(
      (data) => { if (active) setPatients(data.patients); },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function handleCreated(patient) {
    setPatients((current) => [...current, patient]);
    onViewChange("consultar");
  }

  return (
    <section className="patients" aria-labelledby="patients-title">
      <header className="patients__header">
        <h2 id="patients-title">{creating ? "Novo paciente" : "Pacientes"}</h2>
        {!creating && (
          <Button ref={newPatientButton} onClick={() => onViewChange("cadastrar")}>
            Novo paciente
          </Button>
        )}
      </header>
      <div className="patients__content">
        {creating ? (
          <PatientCreate onCreated={handleCreated} onCancel={() => onViewChange("consultar")} />
        ) : (
          <PatientList patients={patients} loading={loading} error={error} />
        )}
      </div>
    </section>
  );
}
