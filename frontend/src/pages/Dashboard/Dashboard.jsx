import { useId } from "react";
import Button from "../../components/Button/Button";
import "./Dashboard.css";

export default function Dashboard({ user, onPatients, onNewPatient }) {
  const quickAccessTitleId = useId();

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard__intro">
        <h1 id="dashboard-title">Início</h1>
        {user?.username && (
          <p className="dashboard__greeting">Olá, {user.username}!</p>
        )}
      </header>
      <section className="dashboard__quick-access" aria-labelledby={quickAccessTitleId}>
        <h2 id={quickAccessTitleId}>Acesso rápido</h2>
        <div className="dashboard__actions">
          <Button variant="secondary" onClick={onPatients}>
            Pacientes
          </Button>
          <Button onClick={onNewPatient}>Novo paciente</Button>
        </div>
      </section>
    </section>
  );
}
