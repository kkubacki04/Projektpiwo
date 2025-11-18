import React from 'react';
import { posterUrl } from '../lib/tmdb';

export default function MovieModal({ movie, onClose }) {
  if (!movie) return null;

  const title = movie.title || movie.name || 'Brak tytułu';
  const date = movie.release_date || movie.first_air_date || 'brak daty';
  const rating = movie.vote_average ?? '—';
  const lang = movie.original_language ? String(movie.original_language).toUpperCase() : '—';
  const tmdbUrl = movie.media_type === 'tv'
    ? `https://www.themoviedb.org/tv/${movie.id}`
    : `https://www.themoviedb.org/movie/${movie.id}`;

  return (
    <div className="mm-backdrop" role="dialog" onClick={onClose}>
      <div className="mm-dialog" role="document" onClick={(e) => e.stopPropagation()}>
        <button className="mm-close" onClick={onClose} aria-label="Zamknij">×</button>

        <div className="mm-content">
          <div className="mm-poster">
            <img src={posterUrl(movie.poster_path)} alt={title} />
          </div>

          <div className="mm-body">
            <h3 className="mm-title">{title}</h3>
            <div className="mm-meta">
              <span className="mm-badge">⭐ {rating}</span>
              <span className="mm-date">{date}</span>
              <span className="mm-lang">{lang}</span>
            </div>

            <p className="mm-overview">{movie.overview || 'Brak opisu.'}</p>

            <div className="mm-actions">
              <a className="btn btn-primary" href={tmdbUrl} target="_blank" rel="noreferrer">
                Zobacz w TMDB
              </a>
              <button className="btn btn-outline-secondary" onClick={onClose}>Zamknij</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.56);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1080;
        }
        .mm-dialog {
          width: 100%;
          max-width: 980px;
          background: transparent;
          border-radius: 10px;
          position: relative;
        }
        .mm-close {
          position: absolute;
          right: 10px;
          top: 6px;
          background: rgba(255,255,255,0.9);
          border: none;
          width: 40px;
          height: 40px;
          font-size: 22px;
          line-height: 1;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
        }
        .mm-content {
          display: flex;
          gap: 20px;
          background: #fff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(8,12,20,0.2);
        }
        .mm-poster {
          flex: 0 0 42%;
          background: linear-gradient(180deg,#f6f7fb,#fff);
        }
        .mm-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .mm-body {
          flex: 1 1 58%;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mm-title { margin: 0; font-size: 1.35rem; }
        .mm-meta { display:flex; gap:10px; align-items:center; color:#666; font-size:0.95rem; }
        .mm-badge { background:#ffefc6; padding:6px 10px; border-radius:999px; font-weight:600; }
        .mm-overview { margin: 0; color:#333; line-height:1.5; max-height: 38vh; overflow:auto; }
        .mm-actions { margin-top: auto; display:flex; gap:10px; }
        @media (max-width: 768px) {
          .mm-content { flex-direction: column; }
          .mm-poster { flex-basis: auto; height: 320px; }
          .mm-body { padding: 16px; }
        }
      `}</style>
    </div>
  );
}