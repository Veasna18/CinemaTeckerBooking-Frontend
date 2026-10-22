export default function SearchBar({ value, onChange }) {
  return (
    <input
      className="search-input"
      type="search"
      placeholder="Search movies by title..."
      aria-label="Search movies"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}