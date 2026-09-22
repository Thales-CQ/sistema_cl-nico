import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import ProfileMultiSelect from "../../../components/ProfileMultiSelect/ProfileMultiSelect";
import { createUser, getProfiles, updateUser } from "../../../services/api";
import { apiBirthDate, displayBirthDate, maskBirthDate, validatePasswordConfirmation, validateUserFullName } from "../userForm";
import { activeProfiles, hasSelectedProfile } from "../userProfileSelection";

import "./UserCreate.css";

export default function UserCreate({
  user, onSaved, onCancel, onFailure, disabled = false, onBusyChange,
  extraActions, isActive, availableProfiles = [],
}) {
  const editing = Boolean(user);
  const firstInput = useRef(null);
  const birthDateInput = useRef(null);
  const emailInput = useRef(null);
  const usernameInput = useRef(null);
  const passwordInput = useRef(null);
  const confirmationInput = useRef(null);
  const errorMessage = useRef(null);
  const busy = useRef(false);
  const active = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState(() => user?.profiles?.map((profile) => profile.id) ?? []);
  const [profilesLoading, setProfilesLoading] = useState(!editing);
  const [profilesError, setProfilesError] = useState("");
  const [profilesRetry, setProfilesRetry] = useState(0);

  function checkFullName(value) {
    if (editing && !user.full_name && !value.trim()) {
      setNameError("");
      return true;
    }
    try {
      validateUserFullName(value);
      setNameError("");
      return true;
    } catch (failure) {
      setNameError(failure.message);
      return false;
    }
  }

  useEffect(() => {
    active.current = true;
    firstInput.current?.focus();
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    if (error) errorMessage.current?.focus();
  }, [error]);

  useEffect(() => {
    if (editing) return;
    let active = true;
    getProfiles().then(
      (data) => { if (active) setProfiles(activeProfiles(data.profiles)); },
      (failure) => {
        if (!active) return;
        setProfilesError(failure.message);
        onFailure?.(failure);
      },
    ).finally(() => { if (active) setProfilesLoading(false); });
    return () => { active = false; };
  }, [editing, onFailure, profilesRetry]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current || disabled || (!editing && (profilesLoading || profilesError))) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!checkFullName(data.get("full_name"))) {
      firstInput.current?.focus();
      return;
    }
    const payload = {
      full_name: data.get("full_name"), email: data.get("email"),
      username: data.get("username"),
    };
    payload.profile_ids = selectedProfileIds;
    setError("");
    setFieldErrors({});
    try {
      // Leave unfilled legacy fields untouched on a partial update.
      for (const field of ["full_name", "email"]) {
        if (editing && !user[field] && !payload[field]) delete payload[field];
      }
      if (!editing || user.birth_date || data.get("birth_date")) {
        payload.birth_date = apiBirthDate(data.get("birth_date"));
      }
      if (!editing) {
        validatePasswordConfirmation(data.get("password"), data.get("confirmation"));
        payload.password = data.get("password");
      } else {
        payload.is_active = isActive;
      }
    } catch (failure) {
      const field = failure.message.includes("confirmação") ? "confirmation"
        : failure.message.includes("senha") ? "password" : "birth_date";
      setFieldErrors({ [field]: failure.message });
      ({ confirmation: confirmationInput, password: passwordInput, birth_date: birthDateInput })[field].current?.focus();
      return;
    }
    if (!hasSelectedProfile(selectedProfileIds)) {
      setFieldErrors({ profile_ids: "Selecione pelo menos um perfil." });
      return;
    }
    busy.current = true;
    setSaving(true);
    onBusyChange?.(true);
    try {
      const result = editing ? await updateUser(user.id, payload) : await createUser(payload);
      if (!editing) form.reset();
      if (active.current) onSaved(result.user);
    } catch (failure) {
      const message = failure.message.toLowerCase();
      const field = message.includes("nome completo") || message.includes("nome e sobrenome") ? "full_name"
        : message.includes("data de nascimento") ? "birth_date"
          : message.includes("e-mail") && !message.includes("nome de usuário") ? "email"
            : message.includes("nome de usuário") && !message.includes("e-mail") ? "username"
              : message.includes("senha deve") ? "password"
                : failure.errors?.profile_ids || message.includes("perfil") ? "profile_ids" : null;
      if (field === "full_name") {
        setNameError(failure.message);
        firstInput.current?.focus();
      } else if (field) {
        setFieldErrors({ [field]: failure.errors?.[field] || failure.message });
        ({ birth_date: birthDateInput, email: emailInput, username: usernameInput, password: passwordInput })[field]?.current?.focus();
      } else {
        setError(failure.message);
      }
      if (active.current) onFailure?.(failure);
    } finally {
      if (!editing) {
        form.elements.password.value = "";
        form.elements.confirmation.value = "";
      }
      busy.current = false;
      setSaving(false);
      onBusyChange?.(false);
    }
  }

  const locked = saving || disabled;
  const createLocked = locked || profilesLoading || Boolean(profilesError);
  return (
    <form className="user-form" onSubmit={handleSubmit} aria-labelledby="users-title" aria-busy={locked}>
      <div className="user-form__fields">
        <div className="user-form__field">
          <label htmlFor="user-full-name">Nome completo</label>
          <input ref={firstInput} id="user-full-name" name="full_name" autoComplete="off" maxLength={120}
            defaultValue={user?.full_name ?? ""} required={!editing || Boolean(user.full_name)} disabled={locked}
            aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "user-full-name-error" : undefined}
            onBlur={(event) => checkFullName(event.target.value)}
            onChange={(event) => { if (nameError) checkFullName(event.target.value); }}
            onInvalid={(event) => {
              event.preventDefault();
              checkFullName(event.target.value);
              event.target.focus();
            }} />
          {nameError && <small id="user-full-name-error" className="form-field__error" role="alert">{nameError}</small>}
        </div>
        <div className="user-form__field">
          <label htmlFor="user-birth-date">Data de nascimento</label>
          <input ref={birthDateInput} id="user-birth-date" name="birth_date" type="text" inputMode="numeric" placeholder="DD/MM/AAAA"
            pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" maxLength={10} autoComplete="off"
            aria-invalid={Boolean(fieldErrors.birth_date)}
            aria-describedby={fieldErrors.birth_date ? "user-birth-date-error" : undefined}
            onChange={(event) => { event.target.value = maskBirthDate(event.target.value); }}
            defaultValue={displayBirthDate(user?.birth_date)} required={!editing || Boolean(user.birth_date)} disabled={locked} />
          {fieldErrors.birth_date && <small id="user-birth-date-error" className="form-field__error" role="alert">{fieldErrors.birth_date}</small>}
        </div>
        <div className="user-form__field">
          <label htmlFor="user-email">E-mail</label>
          <input ref={emailInput} id="user-email" name="email" type="email" autoComplete="off" maxLength={254}
            defaultValue={user?.email ?? ""} required={!editing || Boolean(user.email)} disabled={locked}
            aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "user-email-error" : undefined} />
          {fieldErrors.email && <small id="user-email-error" className="form-field__error" role="alert">{fieldErrors.email}</small>}
        </div>
        <div className="user-form__field">
          <label htmlFor="user-username">Nome de usuário</label>
          <input ref={usernameInput} id="user-username" name="username" autoComplete="off" maxLength={80}
            defaultValue={user?.username ?? ""} required disabled={locked}
            aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "user-username-error" : undefined} />
          {fieldErrors.username && <small id="user-username-error" className="form-field__error" role="alert">{fieldErrors.username}</small>}
        </div>
        {!editing && <>
          <div className="user-form__field">
            <label htmlFor="user-password">Senha</label>
            <input ref={passwordInput} id="user-password" name="password" type="password" autoComplete="new-password" required disabled={locked}
              placeholder="Mínimo de 12 caracteres." aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "user-password-error" : undefined} />
            {fieldErrors.password && <small id="user-password-error" className="form-field__error" role="alert">{fieldErrors.password}</small>}
          </div>
          <div className="user-form__field">
            <label htmlFor="user-confirmation">Confirmar senha</label>
            <input ref={confirmationInput} id="user-confirmation" name="confirmation" type="password" autoComplete="new-password" required disabled={locked}
              aria-invalid={Boolean(fieldErrors.confirmation)}
              aria-describedby={fieldErrors.confirmation ? "user-confirmation-error" : undefined} />
            {fieldErrors.confirmation && <small id="user-confirmation-error" className="form-field__error" role="alert">{fieldErrors.confirmation}</small>}
          </div>
        </>}
        <div className="user-form__profiles">
          <ProfileMultiSelect profiles={editing ? availableProfiles : profiles} selectedIds={selectedProfileIds}
            onChange={(ids) => { setSelectedProfileIds(ids); if (fieldErrors.profile_ids) setFieldErrors({}); }}
            disabled={editing ? locked : createLocked} error={fieldErrors.profile_ids} />
          {!editing && profilesLoading && <p className="users__hint" role="status">Carregando perfis...</p>}
          {!editing && profilesError && <div className="users__error" role="alert">
            <p>{profilesError}</p>
            <Button variant="secondary" onClick={() => {
              setProfilesLoading(true);
              setProfilesError("");
              setProfilesRetry((current) => current + 1);
            }}>Tentar novamente</Button>
          </div>}
        </div>
      </div>
      {editing && (!user.full_name || !user.birth_date || !user.email) &&
        <p className="users__hint">Cadastro legado: você pode completar os campos ainda não preenchidos.</p>}
      {error && <p ref={errorMessage} tabIndex={-1} className="users__error" role="alert">{error}</p>}
      <div className="user-form__actions">
        <Button className="user-form__save" type="submit" disabled={editing ? locked : createLocked}>
          {saving ? (editing ? "Atualizando..." : "Salvando...") : (editing ? "Atualizar" : "Salvar")}
        </Button>
        <Button className="user-form__cancel" variant="secondary" onClick={onCancel} disabled={locked}>Cancelar</Button>
        {extraActions}
      </div>
    </form>
  );
}
