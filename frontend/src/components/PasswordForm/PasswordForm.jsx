import { useEffect, useId, useRef, useState } from "react";
import Button from "../Button/Button";
import { changeOwnPassword, resetUserPassword } from "../../services/api";
import { validatePasswordConfirmation } from "../../pages/Users/userForm";
import "../../pages/Users/Users.css";

export default function PasswordForm({ userId, onCancel, onFailure, disabled = false, onBusyChange }) {
  const own = userId === undefined;
  const prefix = useId();
  const firstInput = useRef(null);
  const currentInput = useRef(null);
  const newInput = useRef(null);
  const confirmationInput = useRef(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  useEffect(() => { firstInput.current?.focus(); }, []);

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
      (field === "confirmation" ? confirmationInput : newInput).current?.focus();
      return;
    }
    busy.current = true;
    setSaving(true);
    onBusyChange?.(true);
    let focusTarget = firstInput;
    try {
      if (own) await changeOwnPassword(data.get("current_password"), data.get("new_password"));
      else await resetUserPassword(userId, data.get("new_password"));
      setSuccess("Senha atualizada com sucesso.");
    } catch (failure) {
      if (own && /senha atual/i.test(failure.message)) {
        setFieldErrors({ current_password: failure.message });
        focusTarget = currentInput;
      } else if (/senha deve ter pelo menos/i.test(failure.message)) {
        setFieldErrors({ new_password: failure.message });
        focusTarget = newInput;
      } else {
        setError(failure.message);
      }
      onFailure?.(failure);
    } finally {
      form.reset();
      busy.current = false;
      setSaving(false);
      onBusyChange?.(false);
      focusTarget.current?.focus();
    }
  }

  return (
    <form className="user-form" onSubmit={handleSubmit} aria-labelledby={`${prefix}-title`}>
      <h2 id={`${prefix}-title`}>{own ? "Alterar minha senha" : "Redefinir senha"}</h2>
      <div className="user-form__fields">
        {own && <div className="user-form__field">
          <label htmlFor={`${prefix}-current`}>Senha atual</label>
          <input ref={(node) => { firstInput.current = node; currentInput.current = node; }} id={`${prefix}-current`}
            name="current_password" type="password" autoComplete="current-password" required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.current_password)}
            aria-describedby={fieldErrors.current_password ? `${prefix}-current-error` : undefined} />
          {fieldErrors.current_password && <p id={`${prefix}-current-error`} className="form-field__error" role="alert">{fieldErrors.current_password}</p>}
        </div>}
        <div className="user-form__field">
          <label htmlFor={`${prefix}-new`}>Nova senha</label>
          <input ref={(node) => { newInput.current = node; if (!own) firstInput.current = node; }}
            id={`${prefix}-new`} name="new_password" type="password" autoComplete="new-password"
            placeholder="Mínimo de 12 caracteres." required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.new_password)}
            aria-describedby={fieldErrors.new_password ? `${prefix}-new-error` : undefined} />
          {fieldErrors.new_password && <p id={`${prefix}-new-error`} className="form-field__error" role="alert">{fieldErrors.new_password}</p>}
        </div>
        <div className="user-form__field">
          <label htmlFor={`${prefix}-confirm`}>Confirmar nova senha</label>
          <input id={`${prefix}-confirm`} name="confirmation" type="password"
            ref={confirmationInput} autoComplete="new-password" required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.confirmation)}
            aria-describedby={fieldErrors.confirmation ? `${prefix}-confirm-error` : undefined} />
          {fieldErrors.confirmation && <p id={`${prefix}-confirm-error`} className="form-field__error" role="alert">{fieldErrors.confirmation}</p>}
        </div>
      </div>
      {error && <p className="users__error" role="alert">{error}</p>}
      {success && <p className="users__success" role="status">{success}</p>}
      <div className="user-form__actions">
        <Button className={own ? undefined : "user-form__save"} type="submit" disabled={saving || disabled}>{saving ? "Salvando..." : "Salvar nova senha"}</Button>
        <Button className={own ? undefined : "user-form__cancel"} variant="secondary" disabled={saving || disabled} onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
