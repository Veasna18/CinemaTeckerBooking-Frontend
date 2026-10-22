
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`admin-sidebar-wrapper ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <AdminSidebar
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <main className="admin-main">
        <AdminHeader
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
