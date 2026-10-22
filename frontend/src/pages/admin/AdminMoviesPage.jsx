
import { useCallback, useEffect, useState } from "react";
import { normalizeUploadPath } from "../../utils/media";

const API = import.meta.env.VITE_API_URL;

function imageUrl(value) {
  return normalizeUploadPath(value);
}

const blankMovie = {
  title: "",
  description: "",
  genre: "Action",
  durationMinutes: 120,
  rating: "PG-13",
  posterURL: "",
  bannerURL: "",
  releaseDate: "",
  origin: "Hollywood",
  isActive: true,
};

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(blankMovie);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filteredMovies = movies.filter((movie) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [movie.Title, movie.Origin, movie.Genre]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/AdminMovies.php`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load movies");
      }

      setMovies(data.movies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editMovie(movie) {
    setEditingId(movie.MovieID);
    setForm({
      title: movie.Title || "",
      description: movie.Description || "",
      genre: movie.Genre || "",
      durationMinutes: movie.DurationMinutes || 120,
      rating: movie.Rating || "",
      posterURL: imageUrl(movie.PosterURL),
      bannerURL: imageUrl(movie.BannerURL),
      releaseDate: movie.ReleaseDate
        ? String(movie.ReleaseDate).slice(0, 10)
        : "",
      origin: movie.Origin || "",
      isActive: Boolean(movie.IsActive),
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankMovie);
  }

  async function uploadImage(field, file) {
    if (!file) return;
    setError("");
    setMessage(`Uploading ${field === "posterURL" ? "poster" : "banner"}...`);

    const body = new FormData();
    body.append("image", file);

    try {
      const response = await fetch(`${API}/UploadMovieImage.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || "Unable to upload image.");
      }
      setForm((current) => ({ ...current, [field]: data.url }));
      setMessage("Image uploaded. Save the movie to keep the change.");
    } catch (err) {
      setMessage("");
      setError(err.message);
    }
  }

  async function saveMovie(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/AdminMovies.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes),
          movieId: editingId,
          action: editingId ? "update" : "create",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Unable to save movie");
      }

      setMessage(data.message || "Movie saved successfully");
      resetForm();
      await loadMovies();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMovie(movie) {
    if (!window.confirm(`Delete "${movie.Title}" from the catalogue?`)) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/AdminMovies.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          movieId: movie.MovieID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Unable to deactivate movie");
      }

      setMessage(data.message);
      await loadMovies();
    } catch (err) {
          setError(err.message);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">CONTENT MANAGEMENT</p>
          <h1>Movies</h1>
          <p>Add movies, edit details, and control visibility.</p>
        </div>
      </header>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-form" onSubmit={saveMovie}>
        <h2>{editingId ? "Edit movie" : "Add a movie"}</h2>

        <div className="admin-form-grid">
          <label>
            Movie title *
            <input
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              maxLength={150}
              required
            />
          </label>

          <label>
            Genre
            <input
              value={form.genre}
              onChange={(e) => change("genre", e.target.value)}
              maxLength={80}
            />
          </label>

          <label>
            Category
            <select
              value={form.origin}
              onChange={(e) => change("origin", e.target.value)}
            >
              <option value="Hollywood">Hollywood</option>
              <option value="China">China</option>
              <option value="Khmer">Khmer</option>
              <option value="Korea">Korea</option>
              <option value="">Other</option>
            </select>
          </label>

          <label>
            Duration (minutes) *
            <input
              type="number"
              min="1"
              max="1000"
              value={form.durationMinutes}
              onChange={(e) => change("durationMinutes", e.target.value)}
              required
            />
          </label>

          <label>
            Rating
            <input
              value={form.rating}
              onChange={(e) => change("rating", e.target.value)}
              maxLength={20}
              placeholder="PG-13"
            />
          </label>

          <label>
            Release date
            <input
              type="date"
              value={form.releaseDate}
              onChange={(e) => change("releaseDate", e.target.value)}
            />
          </label>

          <label>
            Poster image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => uploadImage("posterURL", e.target.files?.[0])}
              disabled={saving}
            />
            <small className="admin-field-help">JPG, PNG, WEBP or GIF, max 5 MB</small>
            {form.posterURL && (
              <img className="admin-image-preview" src={form.posterURL} alt="Poster preview" />
            )}
          </label>

          <label className="admin-full-width">
            Banner image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => uploadImage("bannerURL", e.target.files?.[0])}
              disabled={saving}
            />
            <small className="admin-field-help">JPG, PNG, WEBP or GIF, max 5 MB</small>
            {form.bannerURL && (
              <img className="admin-banner-preview" src={form.bannerURL} alt="Banner preview" />
            )}
          </label>

          <label className="admin-full-width">
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              maxLength={10000}
            />
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => change("isActive", e.target.checked)}
            />
            Movie is active and visible
          </label>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add movie"}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="admin-table-section">
        <div className="admin-table-heading">
          <h2>Movie catalogue</h2>
          <input
            type="search"
            className="admin-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search movies..."
            aria-label="Search movies"
          />
        </div>

        {loading ? (
          <p>Loading movies...</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Movie</th>
                  <th>Category</th>
                  <th>Genre</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMovies.map((movie) => (
                  <tr key={movie.MovieID}>
                    <td className="admin-product-cell">
                      {movie.PosterURL ? (
                        <img className="admin-table-thumb movie-thumb" src={imageUrl(movie.PosterURL)} alt="" />
                      ) : (
                        <span className="admin-table-thumb-placeholder">🎬</span>
                      )}
                      <div>
                        <strong>{movie.Title}</strong>
                        <small>ID: {movie.MovieID}</small>
                      </div>
                    </td>
                    <td>{movie.Origin || "—"}</td>
                    <td>{movie.Genre || "—"}</td>
                    <td>{movie.DurationMinutes} min</td>
                    <td>
                      <span className={movie.IsActive ? "status-active" : "status-inactive"}>
                        {movie.IsActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => editMovie(movie)}>
                          Edit
                        </button>
                        {Boolean(movie.IsActive) && (
                          <button
                            type="button"
                            className="danger-text"
                            onClick={() => deleteMovie(movie)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredMovies.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      {movies.length === 0
                        ? "No movies found."
                        : "No movies match your search."}
                    </td>
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
