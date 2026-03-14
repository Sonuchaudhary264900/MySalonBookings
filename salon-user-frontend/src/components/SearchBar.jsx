import { useState } from "react";
import { Search } from "lucide-react";

function SearchBar({ onSearch, onUseLocation, loading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by salon name or city..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10 h-12"
        />
      </div>
      <button
        type="submit"
        className="btn-primary h-12 px-5 whitespace-nowrap"
      >
        Search
      </button>
      <button
        type="button"
        onClick={onUseLocation}
        disabled={loading}
        className="h-12 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
        title="Find salons near me"
      >
        <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain" />
        <span className="hidden sm:inline">Near Me</span>
      </button>
    </form>
  );
}

export default SearchBar;
