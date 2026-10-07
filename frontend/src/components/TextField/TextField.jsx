import { forwardRef } from "react";

const TextField = forwardRef(function TextField(props, ref) {
  return <input ref={ref} {...props} />;
});

export default TextField;
