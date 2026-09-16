import { useEffect, useState } from "react";
import { getPatients } from "../../services/api";
import PatientCreate from "./PatientCreate/PatientCreate";
import PatientList from "./PatientList/PatientList";
import "./Patients.css";

export default function Patients({ view = "consultar", onViewChange }) {
  const creating = view === "cadastrar";
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
    <section className={`patients${creating ? " patients--creating" : ""}`} aria-labelledby="patients-title">
      <header className="patients__header">
        {creating ? (
          <h2 id="patients-title">Novo paciente</h2>
        ) : (
          <>
            <span id="patients-title" className="patients__accessible-title">Consulta de pacientes</span>
            <label className="patient-list__search patients__search">
              <svg className="patient-list__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>
              <span className="patient-list__search-label">Pesquisar paciente</span>
              <input
                type="search"
                value={search}
                placeholder="Pesquisar paciente"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </>
        )}
      </header>
      <div className="patients__content">
        {creating ? (
          <PatientCreate onCreated={handleCreated} onCancel={() => onViewChange("consultar")} />
        ) : (
          <PatientList
            patients={patients}
            loading={loading}
            error={error}
            search={search}
          />
        )}
      </div>
    </section>
  );
}
