import React from "react";

const CustomSelect = ({
  name,
  value,
  onChange,
  options = [],
  icon,
  labelName,
  hint,
  placeholder = "Select",
  variant = "default",
  required = false,
  disabled = false,
}) => {
  return (
    <div className='input-group'>
      {/* Label */}
      {typeof labelName === "string" ? (
        <label>
          {labelName}
          {required && <span className='required-star'>*</span>}
        </label>
      ) : (
        labelName
      )}

      {/* Wrapper */}
      <div className={`input-wrapper ${variant} ${disabled ? "input-disabled" : ""}`}>
        {icon && <span className='input-icon'>{icon}</span>}

        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className='native-select'
        >
          <option value=''>{placeholder}</option>

          {options.map((opt, index) => {
            const option = typeof opt === "string" ? { value: opt, label: opt } : opt;

            return (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Hint */}
      {hint && <div className='hint'>{hint}</div>}
    </div>
  );
};

export default CustomSelect;
