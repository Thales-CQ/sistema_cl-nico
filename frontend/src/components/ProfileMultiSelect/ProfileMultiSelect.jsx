import { useId } from "react";
import { toggleProfileId } from "./profileSelection";
import "./ProfileMultiSelect.css";

export default function ProfileMultiSelect({
  profiles = [], selectedIds = [], onChange, disabled = false, error = "",
}) {
  const errorId = useId();

  function handleChange(profileId, checked) {
    onChange(toggleProfileId(selectedIds, profileId, checked));
  }

  return <fieldset className="profile-multi-select" disabled={disabled}
    aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>
    <legend>Perfil de usuário</legend>
    <div className="profile-multi-select__options">
      {profiles.map((profile) => <label className="profile-multi-select__option" key={profile.id}>
        <input type="checkbox" value={profile.id} checked={selectedIds.includes(profile.id)}
          onChange={(event) => handleChange(profile.id, event.target.checked)} />
        <span>{profile.name}{profile.is_active === false && <small className="profile-multi-select__inactive"> (Inativo)</small>}</span>
      </label>)}
    </div>
    {error && <small id={errorId} className="form-field__error profile-multi-select__error" role="alert">
      {error}
    </small>}
  </fieldset>;
}
