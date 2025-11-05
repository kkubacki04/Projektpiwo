import React from 'react';
import { posterUrl } from '../lib/tmdb';

export default function MovieCard({ movie, onClick }) {
  return (
    <article className="movie-card" onClick={() => onClick?.(movie)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <img src={posterUrl(movie.poster_path)} alt={movie.title} className="movie-poster" />
      <div className="movie-body">
        <h4 className="movie-title">{movie.title}</h4>
        <div className="movie-meta">
          <span className="badge bg-secondary">{movie.vote_average ?? '—'}</span>
          <small style={{ marginLeft: 8 }}>{movie.release_date ?? 'brak daty'}</small>
        </div>
        <p className="movie-overview">{movie.overview}</p>
      </div>
    </article>
  );
}