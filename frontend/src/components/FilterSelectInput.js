import React from "react";
import useDebouncedValue from "../hooks/useDebouncedValue";

export default function FilterSelectInput({ options = [], value = "", onChange, placeholder }) {
  const debounced = useDebouncedValue(value, 150);
  const opts = options || [];
  return (
    <div className="filter-combo">
      <input
        className="filter-input"
        type="text"
        value={debounced}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list={placeholder + "-list"}
        autoComplete="off"
      />
      <datalist id={placeholder + "-list"}>
        {opts.slice(0, 200).map(opt => <option key={opt} value={opt} />)}
      </datalist>
    </div>
  );
}