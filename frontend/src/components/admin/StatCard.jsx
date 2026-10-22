export default function StatCard({
  title,
  value,
  subtitle,
  icon = "📊",
  color = "red",
}) {
  return (
    <article className={`admin-stat-card stat-${color}`}>
      <div className="stat-card-top">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="stat-card-value">{value ?? 0}</div>

      {subtitle && (
        <p className="stat-card-subtitle">{subtitle}</p>
      )}
    </article>
  );
}
