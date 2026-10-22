import { Link } from "react-router-dom";
import { mediaUrl } from "../../utils/media";

export default function HeroBanner({ movie }) {
  if (!movie) return null;

  return (
    <section
      className="hero"
      style={{
        backgroundImage: `linear-gradient(90deg, #080b14 5%, rgba(8,11,20,.8) 48%, rgba(8,11,20,.1)), url("${mediaUrl(movie.BannerURL || movie.PosterURL)}")`,
      }}
    >
      <div className="hero-content">
        <span className="eyebrow">NOW SHOWING</span>
        <h1>{movie.Title}</h1>
        <p>{movie.Description}</p>
        <div className="hero-meta">
          <span>{movie.Genre}</span>
          <span>{movie.DurationMinutes} minutes</span>
          <span>{movie.Rating || "NR"}</span>
        </div>
        <Link to={`/movie/${movie.MovieID}`} className="btn btn-primary">
          Book tickets
        </Link>
      </div>
    </section>
  );
}
