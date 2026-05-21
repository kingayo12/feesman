const CustomButton = ({
  children,
  onClick,
  type = "button",
  loading = false,
  disabled = false,
  icon,
  otherClass = "",
  variant = "primary",
  loadingText = "Processing...",
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`btn-${variant} ${otherClass} ${isDisabled ? "loading" : ""}`}
      {...props}
    >
      {loading ? (
        loadingText
      ) : (
        <>
          {icon && <span className='btn-icon'>{icon}</span>}

          {typeof children === "string" ? <p>{children}</p> : children}
        </>
      )}
    </button>
  );
};

export default CustomButton;
