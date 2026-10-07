import { useRef, useState } from "react";
import { changeOwnPassword, resetUserPassword } from "../../../services/api";
import { validatePasswordConfirmation } from "../state/userForm";

export default function usePasswordForm({
  mode,
  userId,
  disabled = false,
  onFailure,
  onBusyChange,
}) {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [focusRequest, setFocusRequest] = useState({ field: null, revision: 0 });

  function requestFocus(field) {
    setFocusRequest((currentRequest) => ({
      field,
      revision: currentRequest.revision + 1,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current || disabled) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setFieldErrors({});
    setSuccess("");
    try {
      validatePasswordConfirmation(data.get("new_password"), data.get("confirmation"));
    } catch (failure) {
      const field = failure.message.includes("confirmação") ? "confirmation" : "new_password";
      setFieldErrors({ [field]: failure.message });
      requestFocus(field);
      return;
    }
    busy.current = true;
    setSaving(true);
    onBusyChange?.(true);
    let focusTarget = mode === "own" ? "current_password" : "new_password";
    try {
      if (mode === "own") {
        await changeOwnPassword(data.get("current_password"), data.get("new_password"));
      } else {
        await resetUserPassword(userId, data.get("new_password"));
      }
      setSuccess("Senha atualizada com sucesso.");
    } catch (failure) {
      if (mode === "own" && /senha atual/i.test(failure.message)) {
        setFieldErrors({ current_password: failure.message });
        focusTarget = "current_password";
      } else if (/senha deve ter pelo menos/i.test(failure.message)) {
        setFieldErrors({ new_password: failure.message });
        focusTarget = "new_password";
      } else {
        setError(failure.message);
      }
      onFailure?.(failure);
    } finally {
      form.reset();
      busy.current = false;
      setSaving(false);
      onBusyChange?.(false);
      requestFocus(focusTarget);
    }
  }

  return {
    error,
    fieldErrors,
    focusRequest,
    onSubmit: handleSubmit,
    saving,
    success,
  };
}
