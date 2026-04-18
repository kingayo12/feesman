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
  error, // ✅ Added
  type = "text", // ✅ Added (useful for email, password, tel, etc.)
}) => {
  return (
    <div className='input-group'>
      <label>
        {labelName}
        {required && <span className='required-star'>*</span>} {/* ✅ Visual required indicator */}
      </label>

      <div
        className={`input-wrapper ${variant} ${error ? "input-error" : ""} ${disabled ? "input-disabled" : ""}`}
      >
        {/* ✅ error and disabled states reflected on wrapper */}
        {icon && <span className='input-icon'>{icon}</span>}

        <input
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          required={required}
          disabled={disabled}
          type={type} // ✅ Dynamic type
          aria-invalid={!!error} // ✅ Accessibility
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        />
      </div>

      {/* ✅ Show error OR hint, error takes priority */}
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
