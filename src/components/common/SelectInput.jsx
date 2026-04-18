// components/form/SelectInput.jsx
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
}) => {
  return (
    <div className='input-group'>
      {typeof labelName === "string" ? (
        <label>
          {labelName}
          {required && <span className='required-star'>*</span>}
        </label>
      ) : (
        labelName
      )}

      <div className={`input-wrapper ${variant}`}>
        {icon && <span className='input-icon'>{icon}</span>}

        <select name={name} value={value} onChange={onChange} required={required}>
          {placeholder && (
            <option value='' disabled>
              {placeholder}
            </option>
          )}

          {options.map((opt) =>
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
