import { useEffect, useState } from "react";
import { getPatients, getTodayBirthdays } from "../../services/api";
import "./Dashboard.css";

export default function Dashboard({ user }) {
  const [totalPatients, setTotalPatients] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([getPatients(), getTodayBirthdays()]).then(
      ([patientsData, birthdaysData]) => {
        if (!active) return;
        setTotalPatients(patientsData.total);
        setBirthdays(birthdaysData.patients);
      },
      (failure) => {
        if (active) setError(failure.message);
      },
    ).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const isEmpty = totalPatients === 0;

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard__intro">
        <h1 id="dashboard-title">Início</h1>
        {user?.username && (
          <p className="dashboard__greeting">Olá, {user.username}!</p>
        )}
        <p className="dashboard__description">
          Acompanhe o resumo da clínica e acesse rapidamente a gestão de pacientes.
        </p>
      </header>

      {loading && (
        <p className="dashboard__message" role="status" aria-live="polite">
          Carregando resumo...
        </p>
      )}

      {error && (
        <p className="dashboard__message dashboard__message--error" role="alert">
          {error}
        </p>
      )}

      <div className="dashboard__overview">
        <section className="dashboard__summary" aria-labelledby="dashboard-total-title">
          <div className="dashboard__card">
            <h2 id="dashboard-total-title">Total de pacientes</h2>
            <p className="dashboard__card-value">
              {loading || error ? "—" : totalPatients}
            </p>
            {!loading && !error && isEmpty && (
              <p className="dashboard__empty" role="status" aria-live="polite">
                Ainda não existem pacientes cadastrados.
              </p>
            )}
          </div>
        </section>

        <section className="dashboard__birthdays" aria-labelledby="dashboard-birthdays-title">
          <div className="dashboard__section-heading">
            <h2 id="dashboard-birthdays-title">Aniversariantes de hoje</h2>
            <p>Uma lembrança especial para a rotina da clínica.</p>
          </div>

          {!loading && !error && birthdays.length === 0 && (
            <p className="dashboard__empty" role="status" aria-live="polite">
              Não há aniversariantes hoje.
            </p>
          )}

          {!loading && !error && birthdays.length > 0 && (
            <ul className="dashboard__birthday-list">
              {birthdays.map((patient) => (
                <li key={patient.id}>
                  <article className="dashboard__birthday">
                    <span className="dashboard__avatar" aria-hidden="true">
                      {getInitial(patient.full_name)}
                    </span>
                    <div className="dashboard__birthday-details">
                      <h3>{patient.full_name}</h3>
                      <p>{getBirthdayAge(patient.birth_date)} anos</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function getInitial(fullName) {
  return fullName?.trim().charAt(0).toUpperCase() || "?";
}

function getBirthdayAge(birthDate, today = new Date()) {
  const [birthYear] = birthDate.split("-").map(Number);
  return today.getFullYear() - birthYear;
}
