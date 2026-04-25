import React from "react";
import Select from "react-select";

const CustomSelect = ({
  name,
  value,
  onChange,
  options = [], // For flat list options
  groups = [], // For grouped options
  icon,
  labelName,
  hint,
  placeholder = "Select",
  variant = "default",
  required = false,
  isSearchable = true, // Enable search
}) => {
  // Flatten groups into options for react-select
  const flatOptions =
    groups.length > 0
      ? groups.flatMap((group) => group.options.map((opt) => ({ ...opt, group: group.label })))
      : options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      border: "2px solid var(--input-border)",
      borderRadius: "var(--border-radius-sm)",
      fontSize: "var(--font-size-xs)",
      color: "var(--input-text)",
      backgroundColor: "var(--input-bg)",
      width: "100% !important",
      minWidth: "243px !important",
      boxSizing: "border-box",
      boxShadow: state.isFocused ? "0 0 0 4px var(--accent-muted)" : "none",
      borderColor: state.isFocused ? "var(--accent)" : "var(--input-border)",
      "&:hover": {
        borderColor: "var(--accent)",
      },
      paddingRight: "var(--input-padding-right)",
      paddingLeft: icon ? "calc(var(--input-padding-icon-left) + 2rem)" : "var(--input-padding)",
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: 0,
      paddingLeft: 0,
      paddingRight: 0,
      height: "100%",
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
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
    groupHeading: (provided) => ({
      ...provided,
      color: "var(--text-primary)",
      fontWeight: "bold",
      fontSize: "var(--font-size-xs)",
    }),
  };

  // For grouped options
  const groupedOptions =
    groups.length > 0
      ? groups.map((group) => ({
          label: group.label,
          options: group.options,
        }))
      : undefined;

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
      <div className={`input-wrapper ${variant}`}>
        {icon && <span className='input-icon'>{icon}</span>}

        <Select
          name={name}
          value={flatOptions.find((option) => option.value === value) || null}
          placeholder={placeholder}
          onChange={(selectedOption) =>
            onChange({ target: { name, value: selectedOption ? selectedOption.value : "" } })
          }
          options={groupedOptions || flatOptions}
          isSearchable={isSearchable}
          styles={customStyles}
          classNamePrefix='rselect'
        />
      </div>

      {hint && <div className='hint'>{hint}</div>}
    </div>
  );
};

export default CustomSelect;
