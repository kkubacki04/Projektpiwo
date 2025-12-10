import React, { useEffect, useState, useRef } from 'react';
import { searchMovies, popularMovies, searchSeries, popularSeries } from '../lib/tmdb';
import MovieCard from '../components/MovieCard';
import MovieModal from '../components/MovieModal';
import { supabase } from '../supabaseClient';
import '../index.css';

export default function FavMovies({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [mode, setMode] = useState('popular');
  const [mediaType, setMediaType] = useState('movie');
  
  const [favorites, setFavorites] = useState([]);

  const normalizeResults = (dataResults = [], type = 'movie') => {
    return (dataResults || []).map(item => ({
      ...item,
      title: item.title || item.name || '',
      release_date: item.release_date || item.first_air_date || '',
      media_type: type,
    }));
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorite_movies')
      .select('title')
      .eq('user_id', user.id);
    
    if (data) {
      setFavorites(data.map(item => item.title));
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchPage = async (p = 1, q = query, type = mediaType) => {
    setLoading(true);
    try {
      if (!q) {
        const data = type === 'tv' ? await popularSeries(p) : await popularMovies(p);
        const normalized = normalizeResults(data.results, type);
        setResults(normalized);
        setTotalPages(100 || 0);
        setPage(p);
        setMode('popular');
      } else {
        const data = type === 'tv' ? await searchSeries(q, p) : await searchMovies(q, p);
        const normalized = normalizeResults(data.results, type);
        setResults(normalized);
        setTotalPages(20 || 0);
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
    fetchPage(1, '', mediaType);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!query) {
      debounceRef.current = setTimeout(() => {
        fetchPage(1, '', mediaType);
      }, 150);
      return () => clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPage(1, query, mediaType);
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query, mediaType]);

  useEffect(() => {
    fetchPage(page, query, mediaType);
  }, [page]);

  const handleMediaTypeChange = (type) => {
    if (type === mediaType) return;
    setMediaType(type);
    setPage(1);
  };

  const handleCardClick = (movie) => {
    setSelectedMovie(movie);
  };

  const handleClearSearch = () => {
    setQuery('');
    setPage(1);
    fetchPage(1, '', mediaType);
  };

  const handleAddToFavorites = async (movie) => {
    if (!user) {
      alert('Musisz być zalogowany, aby dodawać filmy do ulubionych.');
      return;
    }

    const title = movie.title || movie.name;
    const releaseDate = movie.release_date || movie.first_air_date || '';
    const releaseYear = releaseDate.split('-')[0];

    try {
      const { error } = await supabase.from('favorite_movies').insert({
        user_id: user.id,
        title: title,
        release_year: releaseYear
      });

      if (error) {
        if (error.code === '23505') { 
          alert('Ten film jest już w ulubionych.');
        } else {
          throw error;
        }
      } else {
        setFavorites(prev => [...prev, title]);
        alert(`Dodano "${title}" do ulubionych!`);
      }
    } catch (error) {
      console.error(error);
      alert('Wystąpił błąd podczas dodawania do ulubionych.');
    }
  };

  const handleRemoveFromFavorites = async (movie) => {
    if (!user) return;
    const title = movie.title || movie.name;

    try {
      const { error } = await supabase
        .from('favorite_movies')
        .delete()
        .eq('user_id', user.id)
        .eq('title', title);

      if (error) throw error;

      setFavorites(prev => prev.filter(t => t !== title));
      alert(`Usunięto "${title}" z ulubionych.`);
    } catch (error) {
      console.error(error);
      alert('Nie udało się usunąć filmu.');
    }
  };

  const isSelectedMovieFavorite = selectedMovie 
    ? favorites.includes(selectedMovie.title || selectedMovie.name)
    : false;

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <h2>Przeglądaj filmy</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '1rem 0' }}>
        <div role="tablist" aria-label="Wybierz typ">
          <button
            className={`btn ${mediaType === 'movie' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => handleMediaTypeChange('movie')}
            aria-pressed={mediaType === 'movie'}
            style={{ marginRight: 8 }}
          >
            Filmy
          </button>
          <button
            className={`btn ${mediaType === 'tv' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => handleMediaTypeChange('tv')}
            aria-pressed={mediaType === 'tv'}
          >
            Seriale
          </button>
        </div>

        <input
          type="search"
          placeholder="Szukaj po tytule..."
          className="form-control"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Szukaj filmów"
          style={{ marginLeft: 8, flex: 1 }}
        />
        {query && (
          <button className="btn btn-outline-secondary" onClick={handleClearSearch}>Wyczyść</button>
        )}
      </div>

      <div style={{ marginBottom: 8, color: '#666' }}>
        {mode === 'popular' && <span>Wyświetlane: {mediaType === 'movie' ? 'Popularne filmy' : 'Popularne seriale'}</span>}
        {mode === 'search' && <span>Wyniki wyszukiwania dla: "{query}"</span>}
      </div>

      {loading && <p>Ładowanie wyników…</p>}

      {!loading && results.length === 0 && (
        <p>{query ? `Brak wyników dla "${query}".` : (mediaType === 'movie' ? 'Brak popularnych filmów do wyświetlenia.' : 'Brak popularnych seriali do wyświetlenia.')}</p>
      )}

      <div className="movie-grid" aria-live="polite">
        {results.map(movie => (
          <MovieCard key={`${movie.media_type}-${movie.id}`} movie={movie} onClick={handleCardClick} />
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
        <MovieModal 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
          isFavorite={isSelectedMovieFavorite}
        />
      )}

      <style>{`
        .movie-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          align-items: start;
        }
        @media (max-width: 1200px) { .movie-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 992px) { .movie-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 576px) { .movie-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 360px) { .movie-grid { grid-template-columns: 1fr; } }
        
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
        @media (max-width: 576px) { .movie-poster { height: 200px; } }
      `}</style>
    </div>
  );
}