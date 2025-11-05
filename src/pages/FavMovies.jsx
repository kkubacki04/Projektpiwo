import React, { useEffect, useState, useRef } from 'react';
import { searchMovies, popularMovies } from '../lib/tmdb';
import MovieCard from '../components/MovieCard';
import MovieModal from '../components/MovieModal';
import '../index.css';

export default function FavMovies() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [mode, setMode] = useState('popular'); 

  const fetchPage = async (p = 1, q = query) => {
    setLoading(true);
    try {
      if (!q) {
        const data = await popularMovies(p);
        setResults(data.results || []);
        setTotalPages(data.total_pages || 0);
        setPage(p);
        setMode('popular');
      } else {
        const data = await searchMovies(q, p);
        setResults(data.results || []);
        setTotalPages(data.total_pages || 0);
        setPage(p);
        setMode('search');
      }
    } catch (err) {
      console.error('Fetch error', err);
      setResults([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!query) {
      debounceRef.current = setTimeout(() => {
        fetchPage(1, '');
      }, 150);
      return () => clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPage(1, query);
    }, 350);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (page === 1 && mode === 'popular' && !query) return;
    fetchPage(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleCardClick = (movie) => {
    setSelectedMovie(movie);
  };

  const handleClearSearch = () => {
    setQuery('');
    setPage(1);
    fetchPage(1, '');
  };

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <h2>Przeglądaj filmy</h2>

      <div style={{ margin: '1rem 0', display: 'flex', gap: 8 }}>
        <input
          type="search"
          placeholder="Szukaj po tytule..."
          className="form-control"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Szukaj filmów"
        />
        {query && (
          <button className="btn btn-outline-secondary" onClick={handleClearSearch}>Wyczyść</button>
        )}
      </div>

      <div style={{ marginBottom: 8, color: '#666' }}>
        {mode === 'popular' && <span>Wyświetlane: Popularne filmy</span>}
        {mode === 'search' && <span>Wyniki wyszukiwania dla: "{query}"</span>}
      </div>

      {loading && <p>Ładowanie wyników…</p>}

      {!loading && results.length === 0 && (
        <p>{query ? `Brak wyników dla "${query}".` : 'Brak popularnych filmów do wyświetlenia.'}</p>
      )}

      <div className="movie-grid" aria-live="polite">
        {results.map(movie => (
          <MovieCard key={movie.id} movie={movie} onClick={handleCardClick} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Poprzednia
          </button>
          <span>{page} / {totalPages}</span>
          <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Następna
          </button>
        </div>
      )}

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      <style>{`
        .movie-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }
        .movie-card {
          border: 1px solid #e4e4e4;
          border-radius: 8px;
          overflow: hidden;
          display:flex;
          flex-direction:column;
          background: #fff;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .movie-card:hover { transform: translateY(-4px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .movie-poster { width: 100%; height: 270px; object-fit: cover; background: #f0f0f0; }
        .movie-body { padding: 0.6rem; display:flex; flex-direction:column; gap:6px; min-height: 120px; }
        .movie-title { margin: 0; font-size: 1rem; line-height: 1.1; }
        .movie-meta { display:flex; align-items:center; color:#555; font-size:0.85rem; }
        .movie-overview { margin: 0; font-size:0.85rem; color:#444; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 576px) {
          .movie-poster { height: 200px; }
        }
      `}</style>
    </div>
  );
}
