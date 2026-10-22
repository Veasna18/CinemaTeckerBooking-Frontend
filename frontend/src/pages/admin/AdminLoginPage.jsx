
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!API) {
      setError("API URL is missing. Check your React .env file.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/AdminAuth.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "login",
          username: username.trim(),
          password,
        }),
      });

      // Read the response as text first to avoid JSON parsing crashes.
      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Invalid PHP response:", responseText);

        throw new Error(
          responseText.trim()
            ? "PHP returned invalid JSON. Check AdminAuth.php and the PHP error log."
            : `PHP returned an empty response (HTTP ${response.status}). Check your API URL and server.`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || `Login failed (HTTP ${response.status}).`
        );
      }

      if (data.authenticated !== true) {
        throw new Error("Login succeeded without an authenticated session.");
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);

      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to PHP. Check your API URL, server, and CORS settings."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link to="/" className="admin-login-brand">
          <span>🎬</span> CinemaTaket
        </Link>

        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Welcome back</h1>

        <p className="admin-login-description">
          Sign in to manage movies, showtimes, bookings and concessions.
        </p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            type="text"
            autoComplete="username"
            required
            maxLength={50}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="admin-login-footer">
          Authorized administrators only.
        </p>
      </section>
    </main>
  );
}
