import "./Button.css";

export default function Button({ type = "button", variant = "primary", className = "", children, ...props }) {
  return (
    <button type={type} className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
