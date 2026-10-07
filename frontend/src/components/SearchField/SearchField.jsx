import { forwardRef } from "react";

const SearchField = forwardRef(function SearchField(props, ref) {
  return <input ref={ref} type="search" {...props} />;
});

export default SearchField;
