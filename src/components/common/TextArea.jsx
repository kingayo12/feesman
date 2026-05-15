import React from "react";

export default function CustomTextArea({
  labelName,
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  rows = 4,
  name,
  error,
  icon,
  helperText,
  className = "",
}) {
  return (
    <div className={`custom-input-group ${className}`}>
      {labelName && (
        <label className="custom-label">
          {labelName}
          {required && <span className="required">*</span>}
        </label>
      )}

      <div className={`textarea-wrapper ${error ? "has-error" : ""}`}>
        {icon && <span className="input-icon">{icon}</span>}

        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`custom-textarea ${icon ? "with-icon" : ""}`}
        />
      </div>

      {helperText && <small className="helper-text">{helperText}</small>}

      {error && <small className="error-text">{error}</small>}
    </div>
  );
}