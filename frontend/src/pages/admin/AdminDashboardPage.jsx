
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const sections = [
  { title: "Movies", description: "Manage movie details and posters", path: "/admin/movies", icon: "🎬" },
  { title: "Showtimes", description: "Schedule movies and set ticket prices", path: "/admin/showtimes", icon: "🕒" },
  { title: "Bookings", description: "View and manage reservations", path: "/admin/bookings", icon: "🎟️" },
  { title: "Discounts", description: "Create and manage promotions", path: "/admin/discounts", icon: "🏷️" },
  { title: "Concessions", description: "Manage snacks, drinks and prices", path: "/admin/concessions", icon: "🍿" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch(`${API}/AdminDashboard.php`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load dashboard.");
        }

        setStats(data.stats);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, []);

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">CINEMATAKET MANAGEMENT</p>
          <h1>Admin Dashboard</h1>
          <p>Manage your cinema from one place.</p>
        </div>
      </header>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : error ? (
        <div className="admin-error" role="alert">
          <p>{error}</p>
          <p>Sign in with an authorized administrator account.</p>
        </div>
      ) : (
        <section className="admin-stats">
          <Stat title="Movies" value={stats?.movies} />
          <Stat title="Upcoming shows" value={stats?.upcomingShowtimes} />
          <Stat title="Bookings" value={stats?.bookings} />
          <Stat title="Revenue" value={`$${Number(stats?.revenue ?? 0).toFixed(2)}`} />
        </section>
      )}

      <h2 className="admin-section-title">Management</h2>

      <section className="admin-management-grid">
        {sections.map((section) => (
          <Link
            className="admin-management-card"
            to={section.path}
            key={section.path}
          >
            <span className="admin-card-icon">{section.icon}</span>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <span className="admin-card-action">Manage →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <article className="admin-stat-card">
      <p>{title}</p>
      <strong>{value ?? "—"}</strong>
    </article>
  );
}
