import { useEffect, useRef, useState } from "react";
import { createUser, getAssignableProfiles, updateUser } from "../../../services/api";
import { apiBirthDate, validatePasswordConfirmation, validateUserFullName } from "../state/userForm";
import { hasSelectedProfile } from "../state/userProfileSelection";

export default function useUserForm({
  user, onSaved, onFailure, disabled = false, onBusyChange,
  isActive, availableProfiles = [], canUpdateData = true,
  canAssignProfiles = true, canChangeStatus = true, canSubmit = true,
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState(() => user?.profiles?.map((profile) => profile.id) ?? []);
  const [profilesLoading, setProfilesLoading] = useState(!editing && canAssignProfiles);
  const [profilesError, setProfilesError] = useState("");
  const [profilesRetry, setProfilesRetry] = useState(0);

  function checkFullName(value, showError = submitAttempted) {
    if (editing && !user.full_name && !value.trim()) {
      setNameError("");
      return true;
    }
    try {
      validateUserFullName(value);
      if (showError || nameError) setNameError("");
      return true;
    } catch (failure) {
      if (showError) setNameError(failure.message);
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
    if (editing || !canAssignProfiles) return undefined;
    let profilesRequestActive = true;
    getAssignableProfiles().then(
      (data) => { if (profilesRequestActive) setProfiles(data.profiles); },
      (failure) => {
        if (!profilesRequestActive) return;
        setProfilesError(failure.message);
        onFailure?.(failure);
      },
    ).finally(() => { if (profilesRequestActive) setProfilesLoading(false); });
    return () => { profilesRequestActive = false; };
  }, [editing, canAssignProfiles, onFailure, profilesRetry]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current || disabled || (!editing && (profilesLoading || profilesError))) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitAttempted(true);
    if (canUpdateData && !checkFullName(data.get("full_name"), true)) {
      firstInput.current?.focus();
      return;
    }
    const payload = {};
    if (canUpdateData) Object.assign(payload, {
      full_name: data.get("full_name"), email: data.get("email"),
      username: data.get("username"),
    });
    if (canAssignProfiles) payload.profile_ids = selectedProfileIds;
    setError("");
    setFieldErrors({});
    try {
      // Leave unfilled legacy fields untouched on a partial update.
      for (const field of canUpdateData ? ["full_name", "email"] : []) {
        if (editing && !user[field] && !payload[field]) delete payload[field];
      }
      if (canUpdateData && (!editing || user.birth_date || data.get("birth_date"))) {
        payload.birth_date = apiBirthDate(data.get("birth_date"));
      }
      if (!editing) {
        validatePasswordConfirmation(data.get("password"), data.get("confirmation"));
        payload.password = data.get("password");
      } else if (canChangeStatus) {
        if (canChangeStatus) payload.is_active = isActive;
      }
    } catch (failure) {
      const field = failure.message.includes("confirmação") ? "confirmation"
        : failure.message.includes("senha") ? "password" : "birth_date";
      setFieldErrors({ [field]: failure.message });
      ({ confirmation: confirmationInput, password: passwordInput, birth_date: birthDateInput })[field].current?.focus();
      return;
    }
    if (canAssignProfiles && !hasSelectedProfile(selectedProfileIds)) {
      setFieldErrors({ profile_ids: "Selecione pelo menos um perfil." });
      return;
    }
    busy.current = true;
    setSaving(true);
    onBusyChange?.(true);
    try {
      const result = editing
        ? (canUpdateData || canAssignProfiles ? await updateUser(user.id, payload) : { user })
        : await createUser(payload);
      if (!editing) form.reset();
      if (active.current) await onSaved(result.user);
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
  return {
    availableProfiles, birthDateInput, canAssignProfiles, canChangeStatus, canSubmit, canUpdateData, createLocked,
    editing, emailInput, error, errorMessage, fieldErrors, firstInput, handleSubmit,
    isActive, locked, nameError, onCancel: undefined, passwordInput, profiles,
    profilesError, profilesLoading, profilesRetry, selectedProfileIds, setFieldErrors,
    setProfilesError, setProfilesLoading, setProfilesRetry, setSelectedProfileIds,
    submitAttempted, saving, user, usernameInput, confirmationInput,
    markSubmitAttempted: () => setSubmitAttempted(true),
    onFullNameChange: (value) => checkFullName(value, true),
  };
}
