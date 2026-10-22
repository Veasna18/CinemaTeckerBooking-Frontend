export default function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}