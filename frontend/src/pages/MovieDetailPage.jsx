import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/common/Loading";
import { useBookingContext } from "../context/BookingContext";
import { mediaUrl } from "../utils/media";

const API = import.meta.env.VITE_API_URL;

export default function MovieDetailPage() {
  const { id } = useParams();
  const { updateBooking } = useBookingContext();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMovie(null);
      setError("");

      try {
        const [movieResponse, showtimeResponse] = await Promise.all([
          fetch(`${API}/Movies.php?id=${encodeURIComponent(id)}`),
          fetch(`${API}/Showtimes.php?movieId=${encodeURIComponent(id)}`),
        ]);

        if (movieResponse.status === 404) {
          throw new Error("This movie could not be found.");
        }

        if (!movieResponse.ok || !showtimeResponse.ok) {
          throw new Error("Unable to load movie information.");
        }

        const movieData = await movieResponse.json();
        const showtimeData = await showtimeResponse.json();

        if (cancelled) return;

        // Movies.php falls back to the full list when `id` is not a valid
        // integer, in which case there is no single `movie` in the response.
        if (!movieData.movie) {
          throw new Error("This movie could not be found.");
        }

        setMovie(movieData.movie);
        setShowtimes(showtimeData.showtimes || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <div className="container">{error}</div>;
  if (!movie) return <Loading />;

  return (
    <section className="container detail-page">
      <div className="detail-layout">
        <img
          className="detail-poster"
          src={mediaUrl(movie.PosterURL, "https://placehold.co/400x600?text=Movie")}
          alt={movie.Title}
        />
        <div className="detail-info">
          <p className="eyebrow">{movie.Genre}</p>
          <h1>{movie.Title}</h1>
          <p>{movie.Description}</p>
          <p>{movie.DurationMinutes} minutes · {movie.Rating || "NR"}</p>

          <h2>Select a showtime</h2>

          {showtimes.length === 0 && (
            <p>No upcoming showtimes are available.</p>
          )}

          <div className="showtime-list">
            {showtimes.map((show) => (
              <Link
                key={show.ShowtimeID}
                className="showtime-option"
                to={`/seats/${show.ShowtimeID}`}
                onClick={() => updateBooking({
                  movie,
                  showtime: show,
                  seats: [],
                  concessions: [],
                  confirmation: null,
                })}
              >
                <strong>
                  {new Date(show.StartTime).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
                <span>{show.HallName}</span>
                <span>${Number(show.TicketPrice).toFixed(2)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
