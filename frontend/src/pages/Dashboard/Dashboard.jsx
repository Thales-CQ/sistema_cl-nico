import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../../components/Button/Button";
import { getPatients, getTodayBirthdays } from "../../services/api";
import { displayUserName } from "../../services/displayUserName";
import { useAuth } from "../../hooks/useAuth";
import { handlePatientAccessDenied, hasPatientsView, runDashboardRequest } from "./dashboardAccess";
import "./Dashboard.css";

export default function Dashboard({ user }) {
  const { refreshSession } = useAuth();
  const canViewPatients = hasPatientsView(user);
  const [patientCount, setPatientCount] = useState({ total: null, loading: true, error: "" });
  const [birthdayList, setBirthdayList] = useState({ patients: [], loading: true, error: "" });
  const [patientCountRetry, setPatientCountRetry] = useState(0);
  const [birthdayListRetry, setBirthdayListRetry] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionSnapshot, setPermissionSnapshot] = useState(canViewPatients);
  const permissionSyncStarted = useRef(false);
  const patientDataRestricted = !canViewPatients || permissionDenied;

  if (permissionSnapshot !== canViewPatients) {
    setPermissionSnapshot(canViewPatients);
    if (!canViewPatients) {
      setPatientCount({ total: null, loading: false, error: "" });
      setBirthdayList({ patients: [], loading: false, error: "" });
    }
  }

  const handleRequestFailure = useCallback((failure) => {
    return handlePatientAccessDenied(failure, {
      denyAccess: () => setPermissionDenied(true),
      clearData: () => {
        setPatientCount({ total: null, loading: false, error: "" });
        setBirthdayList({ patients: [], loading: false, error: "" });
      },
      syncSession: () => {
        if (permissionSyncStarted.current) return;
        permissionSyncStarted.current = true;
        refreshSession();
      },
    });
  }, [refreshSession]);

  useEffect(() => {
    if (!canViewPatients || permissionDenied) return undefined;
    return runDashboardRequest({
      enabled: canViewPatients && !permissionDenied,
      request: getPatients,
      onSuccess: (patientsData) => setPatientCount({ total: patientsData.total, loading: false, error: "" }),
      onFailure: (failure) => setPatientCount({
        total: null,
        loading: false,
        error: failure?.message || "Não foi possível carregar o total de pacientes.",
      }),
      onForbidden: handleRequestFailure,
    });
  }, [canViewPatients, handleRequestFailure, patientCountRetry, permissionDenied]);

  useEffect(() => {
    if (!canViewPatients || permissionDenied) return undefined;
    return runDashboardRequest({
      enabled: canViewPatients && !permissionDenied,
      request: getTodayBirthdays,
      onSuccess: (birthdaysData) => setBirthdayList({ patients: birthdaysData.patients, loading: false, error: "" }),
      onFailure: (failure) => setBirthdayList({
        patients: [],
        loading: false,
        error: failure?.message || "Não foi possível carregar os aniversariantes de hoje.",
      }),
      onForbidden: handleRequestFailure,
    });
  }, [birthdayListRetry, canViewPatients, handleRequestFailure, permissionDenied]);

  function retryPatientCount() {
    setPatientCount({ total: null, loading: true, error: "" });
    setPatientCountRetry((attempt) => attempt + 1);
  }

  function retryBirthdayList() {
    setBirthdayList({ patients: [], loading: true, error: "" });
    setBirthdayListRetry((attempt) => attempt + 1);
  }

  const isEmpty = patientCount.total === 0;
  const displayName = displayUserName(user);

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard__intro">
        <h1 id="dashboard-title">Início</h1>
        {displayName && (
          <p className="dashboard__greeting">Olá, {displayName}!</p>
        )}
        <p className="dashboard__description">
          Acompanhe o resumo da clínica e acesse rapidamente a gestão de pacientes.
        </p>
      </header>

      {patientDataRestricted ? (
        <div className="dashboard__overview">
          <section className="dashboard__summary" aria-label="Acesso aos dados de pacientes">
            <p className="dashboard__empty" role="status">Acesso restrito aos dados de pacientes.</p>
          </section>
        </div>
      ) : (
      <div className="dashboard__overview">
        <section className="dashboard__summary" aria-labelledby="dashboard-total-title">
          <div className="dashboard__card">
            <h2 id="dashboard-total-title">Total de pacientes</h2>
            <p className="dashboard__card-value">
              {patientCount.loading || patientCount.error ? "—" : patientCount.total}
            </p>
            {patientCount.loading && (
              <p className="dashboard__empty" role="status" aria-live="polite">
                Carregando total de pacientes...
              </p>
            )}
            {patientCount.error && (
              <>
                <p className="dashboard__message dashboard__message--error" role="alert">
                  {patientCount.error}
                </p>
                <Button variant="secondary" onClick={retryPatientCount}>
                  Tentar carregar o total novamente
                </Button>
              </>
            )}
            {!patientCount.loading && !patientCount.error && isEmpty && (
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

          {birthdayList.loading && (
            <p className="dashboard__empty" role="status" aria-live="polite">
              Carregando aniversariantes de hoje...
            </p>
          )}

          {birthdayList.error && (
            <>
              <p className="dashboard__message dashboard__message--error" role="alert">
                {birthdayList.error}
              </p>
              <Button variant="secondary" onClick={retryBirthdayList}>
                Tentar carregar os aniversariantes novamente
              </Button>
            </>
          )}

          {!birthdayList.loading && !birthdayList.error && birthdayList.patients.length === 0 && (
            <p className="dashboard__empty" role="status" aria-live="polite">
              Não há aniversariantes hoje.
            </p>
          )}

          {!birthdayList.loading && !birthdayList.error && birthdayList.patients.length > 0 && (
            <ul className="dashboard__birthday-list">
              {birthdayList.patients.map((patient) => (
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
      )}
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
