import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const emptyForm = { username: "", displayName: "", password: "", confirmPassword: "" };

async function readApiResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const preview = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(
      `The PHP API returned HTML instead of JSON (HTTP ${response.status}). ${preview || "Check the API URL and PHP error log."}`
    );
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/AdminUsers.php`, { credentials: "include", headers: { Accept: "application/json" } });
      const data = await readApiResponse(response);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot connect to PHP API. Check Apache and the API URL." : err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API}/AdminUsers.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: form.username.trim(), displayName: form.displayName.trim(), password: form.password }),
      });
      const data = await readApiResponse(response);
      setMessage(data.message || "Admin user created successfully.");
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot connect to PHP API. Check Apache and the API URL." : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <p className="eyebrow">ACCESS CONTROL</p>
      <h1>Admin users</h1>
      <p>Create another administrator account. Only a logged-in administrator can access this page.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-form" onSubmit={createUser}>
        <h2>Create admin user</h2>
        <div className="admin-form-grid">
          <label>Username *<input required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+" value={form.username} onChange={(e) => change("username", e.target.value)} placeholder="manager01" /></label>
          <label>Display name *<input required maxLength={120} value={form.displayName} onChange={(e) => change("displayName", e.target.value)} placeholder="Cinema Manager" /></label>
          <label>Password *<input required minLength={8} maxLength={255} type="password" autoComplete="new-password" value={form.password} onChange={(e) => change("password", e.target.value)} placeholder="At least 8 characters" /></label>
          <label>Confirm password *<input required minLength={8} maxLength={255} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => change("confirmPassword", e.target.value)} placeholder="Repeat password" /></label>
        </div>
        <div className="admin-form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create admin user"}</button></div>
      </form>

      <section className="admin-table-section">
        <h2>Existing admin users</h2>
        {loading ? <p>Loading users...</p> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Username</th><th>Display name</th><th>Role</th><th>Status</th><th>Created</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.AdminID}><td>{user.Username}</td><td>{user.DisplayName}</td><td>{user.Role}</td><td>{Boolean(user.IsActive) ? "Active" : "Inactive"}</td><td>{String(user.CreatedAt || "").replace("T", " ").slice(0, 16)}</td></tr>)}
          {!users.length && <tr><td colSpan={5}>No admin users found.</td></tr>}
        </tbody></table></div>}
      </section>
    </main>
  );
}
