import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Public Customer Pages
import HomePage from "../pages/HomePage";
import MovieDetailPage from "../pages/MovieDetailPage";
import SeatSelectionPage from "../pages/SeatSelectionPage";
import ConcessionsPage from "../pages/ConcessionsPage";
import CheckoutPage from "../pages/CheckoutPage";
import SuccessPage from "../pages/SuccessPage";

// Admin Protection & Layout
import AdminLayout from "../components/admin/AdminLayout";


// Admin Pages
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminMoviesPage from "../pages/admin/AdminMoviesPage";
import AdminShowtimesPage from "../pages/admin/AdminShowtimesPage";
import AdminDiscountsPage from "../pages/admin/AdminDiscountsPage";
import AdminConcessionsPage from "../pages/admin/AdminConcessionsPage";
import AdminBookingsPage from "../pages/admin/AdminBookingsPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";

const API = import.meta.env.VITE_API_URL;

// Server-verified authentication guard component for admin pages
function AdminProtectedWrapper({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/AdminAuth.php`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          setStatus("unauthorized");
          return;
        }

        setStatus("authorized");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return <p className="container">Checking administrator access...</p>;
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" replace />;
  }

  if (status === "error") {
    return <p className="container">Unable to verify admin session. Check the PHP API.</p>;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ================= PUBLIC CUSTOMER ROUTES ================= */}
      <Route path="/" element={<HomePage />} />
      <Route path="/movie/:id" element={<MovieDetailPage />} />
      <Route path="/seats/:showtimeId" element={<SeatSelectionPage />} />
      <Route path="/concessions" element={<ConcessionsPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/success" element={<SuccessPage />} />

      {/* ================= ADMIN AUTHENTICATION ================= */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* ================= PROTECTED ADMIN NESTED ROUTES ================= */}
      <Route
        path="/admin"
        element={
          <AdminProtectedWrapper>
            <AdminLayout />
          </AdminProtectedWrapper>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="movies" element={<AdminMoviesPage />} />
        <Route path="showtimes" element={<AdminShowtimesPage />} />
        <Route path="discounts" element={<AdminDiscountsPage />} />
        <Route path="concessions" element={<AdminConcessionsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      {/* ================= CATCH-ALL 404 ROUTE ================= */}
      <Route
        path="*"
        element={
          <div className="container">
            <h2>Page not found</h2>
          </div>
        }
      />
    </Routes>
  );
}
