import React from "react";

const CustomInput = ({
  name,
  value,
  placeholder,
  onChange,
  labelName,
  icon,
  variant = "default",
  required = false,
  disabled = false,
  hint,
  error,
  type = "text",
}) => {
  return (
    <div className='input-group'>
      <label>
        {labelName}
        {required && <span className='required-star'>*</span>}
      </label>

      <div
        className={`input-wrapper ${variant} ${
          error ? "input-error" : ""
        } ${disabled ? "input-disabled" : ""}`}
      >
        {icon && <span className='input-icon'>{icon}</span>}

        <input
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          required={required}
          disabled={disabled}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        />
      </div>

      {error ? (
        <small className='input-error-msg' id={`${name}-error`} role='alert'>
          {error}
        </small>
      ) : hint ? (
        <small className='hint' id={`${name}-hint`}>
          {hint}
        </small>
      ) : null}
    </div>
  );
};

export default CustomInput;
