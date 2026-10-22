import MovieCard from "./MovieCard";

export default function MovieGrid({ movies }) {
  if (!movies.length) {
    return <p className="empty-state">No movies found. Try another search.</p>;
  }

  return (
    <div className="movie-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.MovieID} movie={movie} />
      ))}
    </div>
  );
}