import { forwardRef } from "react";

const SelectField = forwardRef(function SelectField({ children, ...props }, ref) {
  return <select ref={ref} {...props}>{children}</select>;
});

export default SelectField;
