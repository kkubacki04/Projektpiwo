const TMDB_KEY = process.env.REACT_APP_TMDB_KEY;
const BASE = 'https://api.themoviedb.org/3';

export async function searchMovies(query, page = 1) {
  if (!query) return { results: [], total_pages: 0 };
  const url = `${BASE}/search/movie?api_key=${TMDB_KEY}&language=pl-PL&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB search failed: ${res.status} ${text}`);
  }
  return res.json();
}
export async function popularMovies(page = 1) {
  const url = `${BASE}/movie/popular?api_key=${TMDB_KEY}&language=pl-PL&page=${page}`;
  return fetch(url);
}

export function posterUrl(path) {
  const base = process.env.REACT_APP_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w342';
  return path ? `${base}${path}` : '/placeholder.png';
}