import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

const initialForm = {
  movieId: "",
  hallId: "",
  startTimes: [""],
  ticketPrice: "8.00",
};

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(`PHP returned HTML instead of JSON (HTTP ${response.status}). ${preview || "Check Apache, the API URL, and the PHP error log."}`);
  }
}

export default function AdminShowtimesPage() {
  const [data, setData] = useState({
    movies: [],
    halls: [],
    showtimes: [],
  });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(async (url, options = {}) => {
    let response;
    try {
      response = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new Error(`Cannot connect to the PHP API (${url}). Start Apache/PHP and check that /CinemaTaket exists in your web root.`);
    }

    const result = await readJsonResponse(response);

    if (!response.ok || result.success === false) {
      throw new Error(result.error || "Request failed.");
    }

    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await request(`${API}/AdminShowtimes.php`);
      setData({
        movies: result.movies || [],
        halls: result.halls || [],
        showtimes: result.showtimes || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  function change(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function changeTime(index, value) {
    setForm((old) => ({
      ...old,
      startTimes: old.startTimes.map((item, i) => (i === index ? value : item)),
    }));
  }

  function addTime() {
    setForm((old) => {
      const last = old.startTimes[old.startTimes.length - 1];
      return { ...old, startTimes: [...old.startTimes, last ? last.slice(0, 11) : ""] };
    });
  }

  function removeTime(index) {
    setForm((old) => ({
      ...old,
      startTimes: old.startTimes.filter((_, i) => i !== index),
    }));
  }

  function edit(show) {
    setEditingId(show.ShowtimeID);
    setForm({
      movieId: String(show.MovieID),
      hallId: String(show.HallID),
      startTimes: [
        String(show.StartTime || "").replace(" ", "T").slice(0, 16),
      ],
      ticketPrice: String(show.TicketPrice),
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.movieId ||
      !form.hallId ||
      form.startTimes.length === 0 ||
      form.startTimes.some((item) => !item) ||
      !Number.isFinite(Number(form.ticketPrice)) ||
      Number(form.ticketPrice) <= 0
    ) {
      setError("Enter a movie, hall, start time, and valid ticket price.");
      return;
    }

    setSaving(true);

    try {
      const base = {
        movieId: Number(form.movieId),
        hallId: Number(form.hallId),
        ticketPrice: Number(form.ticketPrice),
      };

      let payload;
      if (editingId) {
        payload = { ...base, action: "update", showtimeId: editingId, startTime: form.startTimes[0] };
      } else if (form.startTimes.length === 1) {
        payload = { ...base, action: "create", startTime: form.startTimes[0] };
      } else {
        payload = { ...base, action: "createMany", startTimes: form.startTimes };
      }

      const result = await request(`${API}/AdminShowtimes.php`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage(result.message || "Showtime saved.");
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeShowStatus(show, action, confirmText, fallbackMessage) {
    if (!window.confirm(confirmText)) return;

    setError("");
    setMessage("");

    try {
      const result = await request(`${API}/AdminShowtimes.php`, {
        method: "POST",
        body: JSON.stringify({
          action,
          showtimeId: Number(show.ShowtimeID),
        }),
      });

      setMessage(result.message || fallbackMessage);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Hides the show from customers but keeps its booking history.
  // The server refuses while confirmed bookings still exist.
  function cancelShow(show) {
    return changeShowStatus(
      show,
      "cancel",
      `Cancel the show for "${show.Title}"? Customers will no longer be able to book it.`,
      "Showtime cancelled."
    );
  }

  // Permanently removes the show; only possible if it never had a booking.
  function deleteShow(show) {
    return changeShowStatus(
      show,
      "delete",
      `Permanently delete the show for "${show.Title}"? This cannot be undone.`,
      "Showtime deleted."
    );
  }

  return (
    <main className="admin-page">
      <p className="eyebrow">SCHEDULING</p>
      <h1>Showtimes</h1>
      <p>Create movie schedules and set prices per showtime.</p>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-form" onSubmit={save}>
        <h2>{editingId ? "Edit showtime" : "Add showtime"}</h2>

        <div className="admin-form-grid">
          <label>
            Movie *
            <select
              required
              value={form.movieId}
              onChange={(e) => change("movieId", e.target.value)}
            >
              <option value="">Select movie</option>
              {data.movies.length === 0 && (
                <option value="" disabled>No movies found - add a movie first</option>
              )}
              {data.movies.map((movie) => (
                <option key={movie.MovieID} value={movie.MovieID}>
                  {movie.Title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hall *
            <select
              required
              value={form.hallId}
              onChange={(e) => change("hallId", e.target.value)}
            >
              <option value="">Select hall</option>
              {data.halls.map((hall) => (
                <option key={hall.HallID} value={hall.HallID}>
                  {hall.HallName}
                </option>
              ))}
            </select>
          </label>

          <div className="showtime-times">
            <span>{editingId ? "Start date and time *" : "Start dates and times *"}</span>
            {form.startTimes.map((time, index) => (
              <div className="showtime-time-row" key={index}>
                <input
                  type="datetime-local"
                  required
                  value={time}
                  onChange={(e) => changeTime(index, e.target.value)}
                />
                {!editingId && form.startTimes.length > 1 && (
                  <button type="button" className="danger-text" onClick={() => removeTime(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {!editingId && (
              <button type="button" className="btn" onClick={addTime}>
                + Add another time
              </button>
            )}
          </div>

          <label>
            Ticket price ($) *
            <input
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              required
              value={form.ticketPrice}
              onChange={(e) => change("ticketPrice", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : form.startTimes.length > 1
                  ? `Create ${form.startTimes.length} showtimes`
                  : "Create showtime"}
          </button>

          {editingId && (
            <button type="button" className="btn" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="admin-table-section">
        <h2>Scheduled shows</h2>

        {loading ? <p>Loading showtimes...</p> : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Movie</th>
                  <th>Hall</th>
                  <th>Date and time</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.showtimes.map((show) => (
                  <tr key={show.ShowtimeID}>
                    <td>{show.Title}</td>
                    <td>{show.HallName}</td>
                    <td>{String(show.StartTime).replace("T", " ").slice(0, 16)}</td>
                    <td>${Number(show.TicketPrice).toFixed(2)}</td>
                    <td>{show.Status}</td>
                    <td>
                      <div className="admin-row-actions">
                        {show.Status === "Scheduled" && (
                          <>
                            <button type="button" onClick={() => edit(show)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-text"
                              onClick={() => cancelShow(show)}
                            >
                              Cancel show
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="danger-text"
                          onClick={() => deleteShow(show)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.showtimes.length && (
                  <tr><td colSpan={6}>No showtimes found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
