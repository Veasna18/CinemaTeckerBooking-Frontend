
import { NavLink, useNavigate } from "react-router-dom";

const menu = [
  { label: "Dashboard", path: "/admin", end: true },
  { label: "Movies", path: "/admin/movies"},
  { label: "Showtimes", path: "/admin/showtimes"},
  { label: "Bookings", path: "/admin/bookings"},
  { label: "Concessions", path: "/admin/concessions"},
  { label: "Discounts", path: "/admin/discounts"},
  { label: "Admin users", path: "/admin/users"},
];

export default function AdminSidebar({ onNavigate, onLogout }) {
  const navigate = useNavigate();

  async function logout() {
    if (onLogout) {
      await onLogout();
      return;
    }

    // Without a logout callback, do not pretend the server session ended.
    navigate("/admin/login");
  }

  return (
    <aside className="admin-sidebar">
      <NavLink
        to="/admin"
        className="admin-brand"
        onClick={onNavigate}
      >
        <span className="admin-brand-icon">C</span>
        <span>
          <strong>CinemaTaket</strong>
          <small>Administration</small>
        </span>
      </NavLink>

      <p className="admin-nav-heading">MANAGEMENT</p>

      <nav className="admin-nav" aria-label="Admin navigation">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `admin-nav-link${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-sidebar-profile">
          <div className="admin-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <small>Management panel</small>
          </div>
        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={logout}
        >
          <span aria-hidden="true">↪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
