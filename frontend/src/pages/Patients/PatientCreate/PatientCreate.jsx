import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import { createPatient } from "../../../services/api";
import "./PatientCreate.css";

export default function PatientCreate({ onCreated, onCancel }) {
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

  useEffect(() => {
    nameInput.current?.focus();
  }, []);

  function resetForm() {
    setFullName("");
    setBirthDate("");
    setSex("");
    setCpf("");
    setPhone("");
    setEmail("");
    setSaveError("");
    setFieldErrors({});
    setSaving(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      full_name: fullName,
      birth_date: birthDate || null,
      sex,
      cpf: cpf || null,
      phone: phone || null,
      email: email || null,
    };
    setSaving(true);
    setSaveError("");
    setFieldErrors({});
    try {
      const data = await createPatient(payload);
      resetForm();
      onCreated(data.patient);
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
    <form className="patient-create" aria-labelledby="patients-title" onSubmit={handleSubmit}>
      <div className="patient-create__fields">
        <div className="patient-create__field">
          <label htmlFor="patient-full-name">Nome completo</label>
          <input ref={nameInput} id="patient-full-name" required name="full_name" type="text"
            autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={fieldErrors.full_name ? "patient-full-name-error" : undefined} />
          {fieldErrors.full_name && <p id="patient-full-name-error" className="patient-create__field-error" role="alert">{fieldErrors.full_name}</p>}
        </div>
        <div className="patient-create__field">
          <label htmlFor="patient-birth-date">Data de nascimento</label>
          <input id="patient-birth-date" required name="birth_date" type="date" autoComplete="bday"
            value={birthDate} onChange={(event) => setBirthDate(event.target.value)}
            aria-invalid={Boolean(fieldErrors.birth_date)}
            aria-describedby={fieldErrors.birth_date ? "patient-birth-date-error" : undefined} />
          {fieldErrors.birth_date && <p id="patient-birth-date-error" className="patient-create__field-error" role="alert">{fieldErrors.birth_date}</p>}
        </div>
        <div className="patient-create__field">
          <label htmlFor="patient-sex">Sexo</label>
          <select id="patient-sex" required name="sex" value={sex} onChange={(event) => setSex(event.target.value)}
            aria-invalid={Boolean(fieldErrors.sex)}
            aria-describedby={fieldErrors.sex ? "patient-sex-error" : undefined}>
            <option value="">Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
          {fieldErrors.sex && <p id="patient-sex-error" className="patient-create__field-error" role="alert">{fieldErrors.sex}</p>}
        </div>
        <div className="patient-create__field">
          <label htmlFor="patient-cpf">CPF</label>
          <input id="patient-cpf" name="cpf" type="text" inputMode="numeric" value={cpf}
            onChange={(event) => setCpf(event.target.value)} aria-invalid={Boolean(fieldErrors.cpf)}
            aria-describedby={fieldErrors.cpf ? "patient-cpf-error" : undefined} />
          {fieldErrors.cpf && <p id="patient-cpf-error" className="patient-create__field-error" role="alert">{fieldErrors.cpf}</p>}
        </div>
        <div className="patient-create__field">
          <label htmlFor="patient-phone">Telefone</label>
          <input id="patient-phone" name="phone" type="tel" autoComplete="tel" value={phone}
            onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "patient-phone-error" : undefined} />
          {fieldErrors.phone && <p id="patient-phone-error" className="patient-create__field-error" role="alert">{fieldErrors.phone}</p>}
        </div>
        <div className="patient-create__field">
          <label htmlFor="patient-email">E-mail</label>
          <input id="patient-email" name="email" type="email" autoComplete="email" value={email}
            onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "patient-email-error" : undefined} />
          {fieldErrors.email && <p id="patient-email-error" className="patient-create__field-error" role="alert">{fieldErrors.email}</p>}
        </div>
      </div>
      {saveError && <p className="patient-create__error" role="alert">{saveError}</p>}
      <div className="patient-create__actions">
        <Button className="patient-create__save" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        <Button className="patient-create__cancel" type="button" variant="secondary" disabled={saving} onClick={() => { resetForm(); onCancel(); }}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
