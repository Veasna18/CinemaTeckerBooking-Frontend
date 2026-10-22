
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/admin": "Dashboard",
  "/admin/movies": "Movie Management",
  "/admin/showtimes": "Showtime Management",
  "/admin/bookings": "Booking Management",
  "/admin/concessions": "Concessions",
  "/admin/discounts": "Discount Management",
  "/admin/users": "Admin Users",
};

export default function AdminHeader({ onMenuClick }) {
  const location = useLocation();

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/admin/movies/")
      ? "Movie Management"
      : "Admin Panel");

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          type="button"
          className="admin-menu-toggle"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div>
          <h1>{title}</h1>
          <p>Welcome to CinemaTaket administration.</p>
        </div>
      </div>

      <div className="admin-header-right">
        <span className="admin-header-date">📅 {today}</span>
        <div className="admin-header-avatar" aria-label="Administrator">
          A
        </div>
      </div>
    </header>
  );
}
