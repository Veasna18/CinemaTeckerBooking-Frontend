
import { useEffect, useState } from "react";

const EMPTY_MOVIE = {
  title: "",
  description: "",
  genre: "Action",
  durationMinutes: 120,
  rating: "PG-13",
  posterURL: "",
  bannerURL: "",
  releaseDate: "",
  isActive: true,
};

export default function MovieForm({
  initialMovie,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const [form, setForm] = useState(EMPTY_MOVIE);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialMovie) {
      setForm(EMPTY_MOVIE);
      return;
    }

    setForm({
      title: initialMovie.Title || "",
      description: initialMovie.Description || "",
      genre: initialMovie.Genre || "",
      durationMinutes: initialMovie.DurationMinutes || 120,
      rating: initialMovie.Rating || "",
      posterURL: initialMovie.PosterURL || "",
      bannerURL: initialMovie.BannerURL || "",
      releaseDate: initialMovie.ReleaseDate
        ? String(initialMovie.ReleaseDate).slice(0, 10)
        : "",
      isActive: Boolean(initialMovie.IsActive),
    });
  }, [initialMovie]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Movie title is required.");
      return;
    }

    const duration = Number(form.durationMinutes);

    if (!Number.isInteger(duration) || duration < 1 || duration > 1000) {
      setError("Duration must be between 1 and 1000 minutes.");
      return;
    }

    for (const field of ["posterURL", "bannerURL"]) {
      if (form[field]) {
        try {
          const url = new URL(form[field]);
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error();
          }
        } catch {
          setError(`${field === "posterURL" ? "Poster" : "Banner"} must be a valid HTTP or HTTPS URL.`);
          return;
        }
      }
    }

    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        durationMinutes: duration,
        description: form.description.trim(),
        genre: form.genre.trim(),
        rating: form.rating.trim(),
        posterURL: form.posterURL.trim(),
        bannerURL: form.bannerURL.trim(),
        releaseDate: form.releaseDate || null,
      });
    } catch (err) {
      setError(err.message || "Unable to save movie.");
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>{initialMovie ? "Edit movie" : "Add movie"}</h2>

      <div className="admin-form-grid">
        <label>
          Movie title *
          <input
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </label>

        <label>
          Genre
          <input
            maxLength={80}
            value={form.genre}
            onChange={(e) => change("genre", e.target.value)}
          />
        </label>

        <label>
          Duration (minutes) *
          <input
            type="number"
            min="1"
            max="1000"
            required
            value={form.durationMinutes}
            onChange={(e) => change("durationMinutes", e.target.value)}
          />
        </label>

        <label>
          Age rating
          <input
            maxLength={20}
            value={form.rating}
            onChange={(e) => change("rating", e.target.value)}
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
          Poster URL
          <input
            type="url"
            maxLength={500}
            value={form.posterURL}
            onChange={(e) => change("posterURL", e.target.value)}
          />
        </label>

        <label className="admin-full-width">
          Banner URL
          <input
            type="url"
            maxLength={500}
            value={form.bannerURL}
            onChange={(e) => change("bannerURL", e.target.value)}
          />
        </label>

        <label className="admin-full-width">
          Description
          <textarea
            rows={4}
            maxLength={10000}
            value={form.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>

        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => change("isActive", e.target.checked)}
          />
          Active and visible to customers
        </label>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}

      <div className="admin-form-actions">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : initialMovie ? "Save changes" : "Add movie"}
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
