import React from "react";

/**
 * CustomSelect
 *
 * Supports two modes:
 *  - Flat list:  pass `options={[{ value, label }, ...]}`
 *  - Grouped:    pass `groups={[{ label, options: [{ value, label }] }, ...]}`
 *
 * If both are passed, `groups` takes precedence.
 */
const CustomSelect = ({
  name,
  value,
  onChange,
  options = [],
  groups, // ← NEW: array of { label, options[] }
  icon,
  labelName,
  hint,
  placeholder = "Select",
  variant = "default",
  required = false,
  disabled = false,
}) => {
  const isGrouped = Array.isArray(groups) && groups.length > 0;

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

          {isGrouped
            ? /* ── Grouped mode ── */
              groups.map((group, gi) => {
                // Skip empty groups so no blank <optgroup> appears
                if (!group.options?.length) return null;

                return (
                  <optgroup key={gi} label={group.label}>
                    {group.options.map((opt, oi) => {
                      const option = typeof opt === "string" ? { value: opt, label: opt } : opt;
                      return (
                        <option key={oi} value={option.value}>
                          {option.label}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })
            : /* ── Flat mode (original behaviour) ── */
              options.map((opt, index) => {
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
