import { useEffect, useRef, useState } from "react";
import Button from "../../components/Button/Button";
import { createPatient, getPatients } from "../../services/api";
import "./Patients.css";

export default function Patients() {
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const nameInput = useRef(null);
  const newPatientButton = useRef(null);
  const wasCreating = useRef(false);

  useEffect(() => {
    if (creating) nameInput.current?.focus();
    else if (wasCreating.current) newPatientButton.current?.focus();
    wasCreating.current = creating;
  }, [creating]);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      full_name: fullName,
      birth_date: birthDate || null,
      sex: sex,
      cpf: cpf || null,
      phone: phone || null,
      email: email || null,
    };
    setSaving(true);
    setSaveError("");
    setFieldErrors({});
    try {
      const data = await createPatient(payload);
      setPatients((current) => [...current, data.patient]);
      setFullName("");
      setBirthDate("");
      setSex("");
      setCpf("");
      setPhone("");
      setEmail("");
      setCreating(false);
    } catch (error) {
      if (error.errors) {
        setFieldErrors(error.errors);
      } else if (error.status === 409 && error.message === "CPF já cadastrado.") {
        setFieldErrors((current) => ({ ...current, cpf: error.message }));
      } else {
        setSaveError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="patients" aria-labelledby="patients-title">
      <div className="patients__header">
        <h2 id="patients-title">
          {creating ? "Novo paciente" : "Pacientes"}
        </h2>
        {!creating && (
          <Button
            ref={newPatientButton}
            onClick={() => setCreating(true)}
          >
            Novo paciente
          </Button>
        )}
      </div>
      {creating ? (
        <form
          className="patients__form"
          aria-labelledby="patients-title"
          onSubmit={handleSubmit}
        >
          <div className="patients__fields">
            <div className="patients__field">
              <label htmlFor="patient-full-name">Nome completo</label>
              <input
                ref={nameInput}
                id="patient-full-name"
                required
                name="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.full_name)}
              />
              {fieldErrors.full_name && (
                <p className="patients__field-error" role="alert">{fieldErrors.full_name}</p>
              )}
            </div>
            <div className="patients__field">
              <label htmlFor="patient-birth-date">Data de nascimento</label>
              <input
                id="patient-birth-date"
                required
                name="birth_date"
                type="date"
                autoComplete="bday"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                aria-invalid={Boolean(fieldErrors.birth_date)}
              />
              {fieldErrors.birth_date && (
                <p className="patients__field-error" role="alert">{fieldErrors.birth_date}</p>
              )}
            </div>
            <div className="patients__field">
              <label htmlFor="patient-sex">Sexo</label>
              <select
                id="patient-sex"
                required
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                aria-invalid={Boolean(fieldErrors.sex)}
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
              {fieldErrors.sex && (
                <p className="patients__field-error" role="alert">{fieldErrors.sex}</p>
              )}
            </div>
            <div className="patients__field">
              <label htmlFor="patient-cpf">CPF</label>
              <input
                id="patient-cpf"
                name="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                aria-invalid={Boolean(fieldErrors.cpf)}
              />
              {fieldErrors.cpf && (
                <p className="patients__field-error" role="alert">{fieldErrors.cpf}</p>
              )}
            </div>
            <div className="patients__field">
              <label htmlFor="patient-phone">Telefone</label>
              <input
                id="patient-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone && (
                <p className="patients__field-error" role="alert">{fieldErrors.phone}</p>
              )}
            </div>
            <div className="patients__field">
              <label htmlFor="patient-email">E-mail</label>
              <input
                id="patient-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <p className="patients__field-error" role="alert">{fieldErrors.email}</p>
              )}
            </div>
          </div>
          {saveError && (
            <p className="patients__error" role="alert">{saveError}</p>
          )}
          <div className="patients__form-actions">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setCreating(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : loading ? (
        <p className="patients__placeholder" role="status">Carregando pacientes...</p>
      ) : error ? (
        <p className="patients__error" role="alert">{error}</p>
      ) : patients.length === 0 ? (
        <p className="patients__placeholder">Nenhum paciente encontrado.</p>
      ) : (
        <div className="patients__table-wrapper" role="region" aria-labelledby="patients-title" tabIndex={0}>
          <table className="patients__table" aria-labelledby="patients-title">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CPF</th>
                <th scope="col">Telefone</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.full_name}</td>
                  <td>{patient.cpf || "—"}</td>
                  <td>{patient.phone || "—"}</td>
                  <td>{patient.email || "—"}</td>
                  <td>{patient.is_active ? "Ativo" : "Inativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
