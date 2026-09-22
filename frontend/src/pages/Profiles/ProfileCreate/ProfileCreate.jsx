import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import { createProfile, updateProfile } from "../../../services/api";

export default function ProfileCreate({ profile, onSaved, onCancel }) {
  const editing = Boolean(profile);
  const [name, setName] = useState(profile?.name ?? "");
  const [isActive, setIsActive] = useState(profile?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const nameInput = useRef(null);

  useEffect(() => { nameInput.current?.focus(); }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setNameError("Informe o nome do perfil.");
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setNameError("");
    setError("");
    try {
      if (editing) await updateProfile(profile.id, { name, is_active: isActive });
      else await createProfile({ name });
      onSaved();
    } catch (failure) {
      if (failure.errors?.name || [400, 409].includes(failure.status)) {
        setNameError(failure.errors?.name || failure.message);
        nameInput.current?.focus();
      } else {
        setError(failure.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return <form className="profile-form" aria-labelledby="profiles-title" aria-busy={saving} onSubmit={handleSubmit}>
    <div className="profile-form__field">
      <label htmlFor="profile-name">Nome do perfil</label>
      <input ref={nameInput} id="profile-name" name="name" type="text" autoComplete="off"
        required value={name} disabled={saving} aria-invalid={Boolean(nameError)}
        aria-describedby={nameError ? "profile-name-error" : undefined}
        onChange={(event) => { setName(event.target.value); if (nameError) setNameError(""); }} />
      {nameError && <small id="profile-name-error" className="form-field__error" role="alert">{nameError}</small>}
    </div>
    {error && <p className="profiles__error" role="alert">{error}</p>}
    <div className="profile-form__actions">
      <Button className="profile-form__save" type="submit" disabled={saving}>
        {saving ? (editing ? "Atualizando..." : "Salvando...") : (editing ? "Atualizar" : "Salvar")}
      </Button>
      <Button className="profile-form__cancel" type="button" variant="secondary" disabled={saving} onClick={onCancel}>
        Cancelar
      </Button>
      {editing && <Button className={`profile-form__status-button profile-form__status-button--${isActive ? "inactive" : "active"}`}
        type="button" variant="secondary" disabled={saving} onClick={() => {
          const action = isActive ? "inativar" : "reativar";
          if (window.confirm(`Deseja ${action} o perfil ${profile.name}?`)) setIsActive(!isActive);
        }}>
        {isActive ? "Inativar" : "Reativar"}
      </Button>}
    </div>
  </form>;
}
