import Button from "../../../components/Button/Button";
import FormField from "../../../components/FormField/FormField";
import ProfileMultiSelect from "../../../components/ProfileMultiSelect/ProfileMultiSelect";
import TextField from "../../../components/TextField/TextField";
import { displayBirthDate, maskBirthDate } from "../state/userForm";
import "../styles/UserForm.css";

export default function UserForm({ form, onCancel, extraActions }) {
  const {
    availableProfiles, birthDateInput, canAssignProfiles, canSubmit, createLocked, editing,
    emailInput, error, errorMessage, fieldErrors, firstInput, handleSubmit, locked,
    nameError, passwordInput, profiles, profilesError, profilesLoading,
    selectedProfileIds, setFieldErrors, setProfilesError, setProfilesLoading, setProfilesRetry,
    setSelectedProfileIds, submitAttempted, saving, user, usernameInput, confirmationInput,
  } = form;

  return (
    <form className="user-form" onSubmit={handleSubmit} aria-labelledby="users-title" aria-busy={locked}>
      <div className="user-form__fields">
        <FormField className="user-form__field" label="Nome completo" htmlFor="user-full-name"
          error={nameError} errorId="user-full-name-error" errorAs="small">
          <TextField ref={firstInput} id="user-full-name" name="full_name" autoComplete="off" maxLength={120}
            defaultValue={user?.full_name ?? ""} required={!editing || Boolean(user.full_name)} readOnly={editing && !form.canUpdateData} disabled={locked}
            aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "user-full-name-error" : undefined}
            onChange={(event) => { if (submitAttempted) form.onFullNameChange(event.target.value); }}
            onInvalid={(event) => {
              event.preventDefault();
              form.markSubmitAttempted();
              form.onFullNameChange(event.target.value);
              event.target.focus();
            }} />
        </FormField>
        <FormField className="user-form__field" label="Data de nascimento" htmlFor="user-birth-date"
          error={fieldErrors.birth_date} errorId="user-birth-date-error" errorAs="small">
          <TextField ref={birthDateInput} id="user-birth-date" name="birth_date" type="text" inputMode="numeric" placeholder="DD/MM/AAAA"
            pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" maxLength={10} autoComplete="off"
            aria-invalid={Boolean(fieldErrors.birth_date)}
            aria-describedby={fieldErrors.birth_date ? "user-birth-date-error" : undefined}
            onChange={(event) => { event.target.value = maskBirthDate(event.target.value); }}
            defaultValue={displayBirthDate(user?.birth_date)} required={!editing || Boolean(user.birth_date)} readOnly={editing && !form.canUpdateData} disabled={locked} />
        </FormField>
        <FormField className="user-form__field" label="E-mail" htmlFor="user-email"
          error={fieldErrors.email} errorId="user-email-error" errorAs="small">
          <TextField ref={emailInput} id="user-email" name="email" type="email" autoComplete="off" maxLength={254}
            defaultValue={user?.email ?? ""} required={!editing || Boolean(user.email)} readOnly={editing && !form.canUpdateData} disabled={locked}
            aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "user-email-error" : undefined} />
        </FormField>
        <FormField className="user-form__field" label="Nome de usuário" htmlFor="user-username"
          error={fieldErrors.username} errorId="user-username-error" errorAs="small">
          <TextField ref={usernameInput} id="user-username" name="username" autoComplete="off" maxLength={80}
            defaultValue={user?.username ?? ""} required readOnly={editing && !form.canUpdateData} disabled={locked}
            aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "user-username-error" : undefined} />
        </FormField>
        {!editing && <>
          <FormField className="user-form__field" label="Senha" htmlFor="user-password"
            error={fieldErrors.password} errorId="user-password-error" errorAs="small">
            <TextField ref={passwordInput} id="user-password" name="password" type="password" autoComplete="new-password" required disabled={locked}
              placeholder="Mínimo de 12 caracteres." aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "user-password-error" : undefined} />
          </FormField>
          <FormField className="user-form__field" label="Confirmar senha" htmlFor="user-confirmation"
            error={fieldErrors.confirmation} errorId="user-confirmation-error" errorAs="small">
            <TextField ref={confirmationInput} id="user-confirmation" name="confirmation" type="password" autoComplete="new-password" required disabled={locked}
              aria-invalid={Boolean(fieldErrors.confirmation)} aria-describedby={fieldErrors.confirmation ? "user-confirmation-error" : undefined} />
          </FormField>
        </>}
        {(canAssignProfiles || editing) && <div className="user-form__profiles">
          <ProfileMultiSelect profiles={editing ? availableProfiles : profiles} selectedIds={selectedProfileIds}
            onChange={(ids) => { setSelectedProfileIds(ids); if (fieldErrors.profile_ids) setFieldErrors({}); }}
            disabled={editing ? locked || !canAssignProfiles : createLocked} error={fieldErrors.profile_ids} />
          {!editing && profilesLoading && <p className="users__hint" role="status">Carregando perfis...</p>}
          {!editing && profilesError && <div className="users__error" role="alert">
            <p>{profilesError}</p>
            <Button variant="secondary" onClick={() => {
              setProfilesLoading(true);
              setProfilesError("");
              setProfilesRetry((current) => current + 1);
            }}>Tentar novamente</Button>
          </div>}
        </div>}
      </div>
      {editing && (!user.full_name || !user.birth_date || !user.email) &&
        <p className="users__hint">Cadastro legado: você pode completar os campos ainda não preenchidos.</p>}
      {error && <p ref={errorMessage} tabIndex={-1} className="users__error" role="alert">{error}</p>}
      <div className="user-form__actions">
        {(canSubmit || !editing) && <Button className="user-form__save" type="submit" disabled={editing ? locked : createLocked}>
          {saving ? (editing ? "Atualizando..." : "Salvando...") : (editing ? "Atualizar" : "Salvar")}
        </Button>}
        <Button className="user-form__cancel" variant="secondary" onClick={onCancel} disabled={locked}>Cancelar</Button>
        {extraActions}
      </div>
    </form>
  );
}
