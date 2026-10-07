import "./FormField.css";

export default function FormField({
  as: Element = "div",
  className,
  label,
  htmlFor,
  labelClassName,
  error,
  errorId,
  errorAs: ErrorElement = "p",
  errorClassName = "form-field__error",
  errorRole = "alert",
  children,
}) {
  const classes = ["form-field", className].filter(Boolean).join(" ");

  return (
    <Element className={classes}>
      {label && <label className={labelClassName} htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && <ErrorElement id={errorId} className={errorClassName} role={errorRole}>{error}</ErrorElement>}
    </Element>
  );
}
