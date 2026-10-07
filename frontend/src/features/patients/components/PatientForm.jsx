import Button from "../../../components/Button/Button";
import FormField from "../../../components/FormField/FormField";
import SelectField from "../../../components/SelectField/SelectField";
import TextField from "../../../components/TextField/TextField";
import "../styles/PatientForm.css";

export default function PatientForm({
  form,
  onCancel,
  extraActions,
  busy = false,
}) {
  const {
    birthDate, cpf, editing, email, fieldErrors, fullName, handleSubmit,
    nameInput, phone, saveError, saving, setBirthDate, setCpf, setEmail,
    setFullName, setPhone, setSex, sex,
  } = form;

  return (
    <form className="patient-create" aria-labelledby="patients-title" onSubmit={handleSubmit}>
      <div className="patient-create__fields">
        <FormField className="patient-create__field" label="Nome completo" htmlFor="patient-full-name"
          error={fieldErrors.full_name} errorId="patient-full-name-error">
          <TextField ref={nameInput} id="patient-full-name" required name="full_name" type="text"
            autoComplete="name" value={fullName} disabled={saving || busy} onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={fieldErrors.full_name ? "patient-full-name-error" : undefined} />
        </FormField>
        <FormField className="patient-create__field" label="Data de nascimento" htmlFor="patient-birth-date"
          error={fieldErrors.birth_date} errorId="patient-birth-date-error">
          <TextField id="patient-birth-date" required name="birth_date" type="date" autoComplete="bday"
            value={birthDate} disabled={saving || busy} onChange={(event) => setBirthDate(event.target.value)}
            aria-invalid={Boolean(fieldErrors.birth_date)}
            aria-describedby={fieldErrors.birth_date ? "patient-birth-date-error" : undefined} />
        </FormField>
        <FormField className="patient-create__field" label="Sexo" htmlFor="patient-sex"
          error={fieldErrors.sex} errorId="patient-sex-error">
          <SelectField id="patient-sex" required name="sex" value={sex} onChange={(event) => setSex(event.target.value)}
            aria-invalid={Boolean(fieldErrors.sex)}
            disabled={saving || busy} aria-describedby={fieldErrors.sex ? "patient-sex-error" : undefined}>
            <option value="">Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </SelectField>
        </FormField>
        <FormField className="patient-create__field" label="CPF" htmlFor="patient-cpf"
          error={fieldErrors.cpf} errorId="patient-cpf-error">
          <TextField id="patient-cpf" name="cpf" type="text" inputMode="numeric" value={cpf}
            disabled={saving || busy} onChange={(event) => setCpf(event.target.value)} aria-invalid={Boolean(fieldErrors.cpf)}
            aria-describedby={fieldErrors.cpf ? "patient-cpf-error" : undefined} />
        </FormField>
        <FormField className="patient-create__field" label="Telefone" htmlFor="patient-phone"
          error={fieldErrors.phone} errorId="patient-phone-error">
          <TextField id="patient-phone" name="phone" type="tel" autoComplete="tel" value={phone}
            disabled={saving || busy} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "patient-phone-error" : undefined} />
        </FormField>
        <FormField className="patient-create__field" label="E-mail" htmlFor="patient-email"
          error={fieldErrors.email} errorId="patient-email-error">
          <TextField id="patient-email" name="email" type="email" autoComplete="email" value={email}
            disabled={saving || busy} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "patient-email-error" : undefined} />
        </FormField>
      </div>
      {saveError && <p className="patient-create__error" role="alert">{saveError}</p>}
      <div className="patient-create__actions">
        <Button className="patient-create__save" type="submit" disabled={saving || busy}>
          {saving ? (editing ? "Atualizando..." : "Salvando...") : (editing ? "Atualizar" : "Salvar")}
        </Button>
        <Button className="patient-create__cancel" type="button" variant="secondary" disabled={saving || busy} onClick={onCancel}>
          Cancelar
        </Button>
        {extraActions}
      </div>
    </form>
  );
}
