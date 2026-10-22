
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function AdminProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/AdminAuth.php`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Authentication check failed.");
        }

        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setAuthenticated(data.authenticated === true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAuthenticated(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (authenticated === null) {
    return <div className="admin-loading">Checking admin access...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children ?? <Outlet />;
}
