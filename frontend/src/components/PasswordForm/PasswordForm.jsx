import { useEffect, useId, useRef } from "react";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import TextField from "../TextField/TextField";
import "./PasswordForm.css";

export default function PasswordForm({
  showCurrentPassword,
  disabled = false,
  saving = false,
  error,
  fieldErrors = {},
  success,
  focusRequest,
  onSubmit,
  onCancel,
}) {
  const prefix = useId();
  const currentInput = useRef(null);
  const newInput = useRef(null);
  const confirmationInput = useRef(null);

  useEffect(() => {
    (showCurrentPassword ? currentInput : newInput).current?.focus();
  }, [showCurrentPassword]);

  useEffect(() => {
    if (!focusRequest?.revision) return;
    const targets = {
      current_password: currentInput,
      new_password: newInput,
      confirmation: confirmationInput,
    };
    targets[focusRequest.field]?.current?.focus();
  }, [focusRequest]);

  return (
    <form className={`password-form${showCurrentPassword ? "" : " password-form--reset"}`}
      onSubmit={onSubmit} aria-labelledby={`${prefix}-title`}>
      <h2 id={`${prefix}-title`}>{showCurrentPassword ? "Alterar minha senha" : "Redefinir senha"}</h2>
      <div className="password-form__fields">
        {showCurrentPassword && <FormField className="password-form__field" label="Senha atual" htmlFor={`${prefix}-current`}
          error={fieldErrors.current_password} errorId={`${prefix}-current-error`}>
          <TextField ref={currentInput} id={`${prefix}-current`}
            name="current_password" type="password" autoComplete="current-password" required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.current_password)}
            aria-describedby={fieldErrors.current_password ? `${prefix}-current-error` : undefined} />
        </FormField>}
        <FormField className="password-form__field" label="Nova senha" htmlFor={`${prefix}-new`}
          error={fieldErrors.new_password} errorId={`${prefix}-new-error`}>
          <TextField ref={newInput}
            id={`${prefix}-new`} name="new_password" type="password" autoComplete="new-password"
            placeholder="Mínimo de 12 caracteres." required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.new_password)}
            aria-describedby={fieldErrors.new_password ? `${prefix}-new-error` : undefined} />
        </FormField>
        <FormField className="password-form__field" label="Confirmar nova senha" htmlFor={`${prefix}-confirm`}
          error={fieldErrors.confirmation} errorId={`${prefix}-confirm-error`}>
          <TextField id={`${prefix}-confirm`} name="confirmation" type="password"
            ref={confirmationInput} autoComplete="new-password" required disabled={saving || disabled}
            aria-invalid={Boolean(fieldErrors.confirmation)}
            aria-describedby={fieldErrors.confirmation ? `${prefix}-confirm-error` : undefined} />
        </FormField>
      </div>
      {error && <p className="password-form__error" role="alert">{error}</p>}
      {success && <p className="password-form__success" role="status">{success}</p>}
      <div className="password-form__actions">
        <Button className={showCurrentPassword ? undefined : "password-form__save"} type="submit" disabled={saving || disabled}>
          {saving ? "Salvando..." : "Salvar nova senha"}
        </Button>
        <Button className={showCurrentPassword ? undefined : "password-form__cancel"} variant="secondary"
          disabled={saving || disabled} onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
