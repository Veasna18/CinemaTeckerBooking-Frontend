import { Link } from "react-router-dom";
import { mediaUrl } from "../../utils/media";

export default function MovieCard({ movie }) {
  return (
    <article className="movie-card">
      <Link to={`/movie/${movie.MovieID}`} className="movie-poster-link">
        <img
          className="movie-poster"
          src={mediaUrl(movie.PosterURL, "https://placehold.co/400x600?text=Movie")}
          alt={`${movie.Title} poster`}
          loading="lazy"
        />
        <span className="movie-rating">{movie.Rating || "NR"}</span>
      </Link>

      <div className="movie-info">
        <p className="movie-genre">{movie.Genre || "General"}</p>
        <h3>{movie.Title}</h3>
        <p className="movie-duration">
          {movie.DurationMinutes} min
        </p>
        <Link to={`/movie/${movie.MovieID}`} className="movie-link">
          View showtimes →
        </Link>
      </div>
    </article>
  );
}
