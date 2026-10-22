export default function GenreFilter({ genres, selected, onSelect }) {
  return (
    <div className="genre-list">
      {genres.map((genre) => (
        <button
          key={genre}
          className={`genre-chip ${selected === genre ? "active" : ""}`}
          onClick={() => onSelect(genre)}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}