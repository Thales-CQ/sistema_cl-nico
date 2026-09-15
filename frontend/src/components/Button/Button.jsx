import { forwardRef } from "react";
import "./Button.css";

const Button = forwardRef(function Button(
  { type = "button", variant = "primary", className = "", children, ...props },
  ref,
) {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");

  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});

export default Button;
