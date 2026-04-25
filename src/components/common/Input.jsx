import React from "react";
import Select from "react-select";

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
  isSelect = false, // New prop for select
  options = [], // Options for select
  isSearchable = true, // For select search
}) => {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      border: "2px solid var(--input-border)",
      borderRadius: "var(--border-radius-sm)",
      fontSize: "var(--font-size-xs)",
      color: "var(--input-text)",
      backgroundColor: "var(--input-bg)",
      minHeight: "48px",
      boxSizing: "border-box",
      boxShadow: state.isFocused ? "0 0 0 4px var(--accent-muted)" : "none",
      borderColor: state.isFocused ? "var(--accent)" : "var(--input-border)",
      "&:hover": {
        borderColor: "var(--accent)",
      },
      paddingRight: "var(--input-padding-right)",
      paddingLeft: icon ? "calc(var(--input-padding-icon-left) + 2.5rem)" : "var(--input-padding)",
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: 0,
      paddingLeft: icon ? "2.5rem" : 0,
      paddingRight: 0,
      height: "100%",
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      paddingLeft: icon ? 0 : undefined,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "var(--text-tertiary)",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "var(--input-text)",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "var(--card-bg)",
      border: "1px solid var(--input-border)",
      borderRadius: "var(--border-radius-sm)",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "var(--accent)"
        : state.isFocused
          ? "var(--accent-muted)"
          : "transparent",
      color: state.isSelected ? "white" : "var(--input-text)",
      cursor: "pointer",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "var(--text-tertiary)",
    }),
  };

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

        {isSelect ? (
          <Select
            name={name}
            value={options.find((option) => option.value === value) || null}
            placeholder={placeholder}
            onChange={(selectedOption) =>
              onChange({ target: { name, value: selectedOption ? selectedOption.value : "" } })
            }
            options={options}
            isSearchable={isSearchable}
            isDisabled={disabled}
            styles={customStyles}
            classNamePrefix='rselect'
          />
        ) : (
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
        )}
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
