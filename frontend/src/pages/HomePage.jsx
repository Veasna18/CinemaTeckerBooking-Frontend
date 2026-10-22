import { useEffect, useMemo, useState } from "react";
import HeroBanner from "../components/movies/HeroBanner";
import MovieGrid from "../components/movies/MovieGrid";
import GenreFilter from "../components/movies/GenreFilter";
import SearchBar from "../components/movies/SearchBar";
import Loading from "../components/common/Loading";

const API = import.meta.env.VITE_API_URL;
const ORIGINS = ["Hollywood", "China", "Khmer", "Korea"];

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const response = await fetch(`${API}/Movies.php`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Could not load movies.");

        const data = await response.json();
        setMovies(data.movies || []);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadMovies();
    return () => controller.abort();
  }, []);

  const origins = useMemo(() => {
    const present = ORIGINS.filter((item) =>
      movies.some((movie) => movie.Origin === item)
    );
    const hasOther = movies.some((movie) => !ORIGINS.includes(movie.Origin));
    return ["All", ...present, ...(hasOther ? ["Other"] : [])];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesTitle = movie.Title.toLowerCase().includes(search.toLowerCase());
      const movieOrigin = ORIGINS.includes(movie.Origin) ? movie.Origin : "Other";
      const matchesOrigin = origin === "All" || movieOrigin === origin;
      return matchesTitle && matchesOrigin;
    });
  }, [movies, search, origin]);

  const groups = useMemo(() => {
    return [...ORIGINS, "Other"]
      .map((name) => ({
        name,
        movies: filteredMovies.filter((movie) =>
          name === "Other"
            ? !ORIGINS.includes(movie.Origin)
            : movie.Origin === name
        ),
      }))
      .filter((group) => group.movies.length > 0);
  }, [filteredMovies]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="container error-state">
        <h2>Unable to load movies</h2>
        <p>{error}</p>
        <p>Check that your PHP server and SQL Server database are running.</p>
      </div>
    );
  }

  return (
    <>
      <HeroBanner movie={movies[0]} />

      <section className="container movies-section" id="movies">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
            <h2>Now Showing</h2>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <GenreFilter
          genres={origins}
          selected={origin}
          onSelect={setOrigin}
        />

        {origin === "All" && groups.length > 0 ? (
          groups.map((group) => (
            <div className="origin-group" key={group.name}>
              <h3 className="origin-title">{group.name}</h3>
              <MovieGrid movies={group.movies} />
            </div>
          ))
        ) : (
          <MovieGrid movies={filteredMovies} />
        )}
      </section>
    </>
  );
}