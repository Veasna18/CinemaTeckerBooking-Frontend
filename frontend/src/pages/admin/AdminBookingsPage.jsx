
import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const api = useCallback(async (options = {}) => {
    const response = await fetch(`${API}/AdminBookings.php`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Booking request failed.");
    }

    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter((booking) => {
    const query = search.trim().toLowerCase();

    const searchable = [
      booking.BookingCode,
      booking.BookingID,
      booking.CustomerName,
      booking.CustomerPhone,
      booking.Title,
      booking.HallName,
      booking.Seats,
    ].map((value) => String(value ?? "").toLowerCase());

    const matchesSearch = !query ||
      searchable.some((value) => value.includes(query));

    const matchesStatus =
      statusFilter === "All" || booking.Status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function cancelBooking(booking) {
    if (booking.Status !== "Confirmed") {
      setError("Only confirmed bookings can be cancelled from this page.");
      return;
    }

    if (!window.confirm(
      `Cancel booking ${booking.BookingCode || booking.BookingID}?`
    )) return;

    setError("");
    setMessage("");

    try {
      const data = await api({
        method: "POST",
        body: JSON.stringify({
          action: "cancel",
          bookingId: Number(booking.BookingID),
        }),
      });

      setMessage(data.message || "Booking cancelled.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="admin-page">
      <p className="eyebrow">RESERVATION MANAGEMENT</p>
      <h1>Bookings</h1>
      <p>Search reservations and review customer booking details.</p>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <section className="admin-table-section">
        <div className="admin-booking-filters">
          <label>
            Search bookings
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Booking code, customer, phone, movie..."
            />
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <button
            type="button"
            className="btn"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <h2>Reservations ({filtered.length})</h2>

        {loading ? <p>Loading bookings...</p> : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Movie / showtime</th>
                  <th>Seats</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.BookingID}>
                    <td>
                      <strong>
                        {booking.BookingCode || `#${booking.BookingID}`}
                      </strong>
                      <small>
                        {booking.BookingDate
                          ? String(booking.BookingDate).replace("T", " ").slice(0, 16)
                          : ""}
                      </small>
                    </td>

                    <td>
                      <strong>{booking.CustomerName}</strong>
                      <small>{booking.CustomerPhone || "No phone recorded"}</small>
                    </td>

                    <td>
                      <strong>{booking.Title || "Unknown movie"}</strong>
                      <small>
                        {booking.StartTime
                          ? String(booking.StartTime).replace("T", " ").slice(0, 16)
                          : ""}
                      </small>
                      <small>{booking.HallName || ""}</small>
                    </td>

                    <td>{booking.Seats || "—"}</td>

                    <td>${Number(booking.TotalAmount || 0).toFixed(2)}</td>

                    <td>
                      <span className={
                        booking.Status === "Confirmed"
                          ? "status-active"
                          : "status-inactive"
                      }>
                        {booking.Status}
                      </span>
                    </td>

                    <td>
                      {booking.Status === "Confirmed" && (
                        <button
                          type="button"
                          className="danger-text"
                          onClick={() => cancelBooking(booking)}
                        >
                          Cancel booking
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={7}>No matching bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
