import React from "react";

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
      <div className={`input-wrapper ${variant}`}>
        {icon && <span className='input-icon'>{icon}</span>}

        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className='w-full outline-none'
        >
          {placeholder && (
            <option value='' disabled>
              {placeholder}
            </option>
          )}

          {/* Render groups if they exist */}
          {groups.length > 0
            ? groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : // Else render flat options
              options.map((opt) =>
                typeof opt === "string" ? (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ) : (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ),
              )}
        </select>
      </div>

      {hint && <div className='hint'>{hint}</div>}
    </div>
  );
};

export default CustomSelect;
