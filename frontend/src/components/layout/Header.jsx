import { Link, NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">C</span>
          Cinema<span className="brand-accent">Taket</span>
        </Link>

        <nav className="navigation">
          <NavLink to="/">Home</NavLink>
          <a href="/#movies">Movies</a>
          <NavLink to="/concessions">Snacks</NavLink>
        </nav>

        <div className="header-actions">
          <Link to="/admin/login" className="header-admin-link">Admin Login</Link>
          <Link to="/" className="header-cta">Book tickets</Link>
        </div>
      </div>
    </header>
  );
}
