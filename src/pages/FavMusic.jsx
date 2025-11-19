import { supabase } from '../supabaseClient';
import React, { useEffect, useState, useRef } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import '../index.css';

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT || `${window.location.origin}/FavMusic`;
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
].join(' ');

const KEY_TOKEN = 'spotify_token_data';
const KEY_CODE_VERIFIER = 'spotify_code_verifier';

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}
function randomString(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let res = '';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) res += charset[values[i] % charset.length];
  return res;
}
async function createCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlEncode(hashed);
}

export default function FavMusic() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState('short');
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState(null);
  const spotifyRef = useRef(null);

  const audioRef = useRef(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_TOKEN);
    if (stored) {
      const tokenData = JSON.parse(stored);
      if (tokenData?.access_token) {
        initSpotifyClient(tokenData.access_token);
        setConnected(true);
        if (tokenExpired(tokenData)) {
          if (tokenData.refresh_token) {
            refreshToken(tokenData.refresh_token).then(newToken => {
              if (newToken?.access_token) {
                saveToken(newToken);
                initSpotifyClient(newToken.access_token);
                setConnected(true);
                fetchTopTracks(tab);
              } else {
                disconnect();
              }
            }).catch(() => disconnect());
          } else {
            disconnect();
          }
        } else {
          fetchTopTracks(tab);
        }
      }
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    if (errorParam) {
      console.error('Spotify auth error', errorParam);
      window.history.replaceState({}, document.title, REDIRECT_URI);
      return;
    }

    if (code) {
      const exchangedFlag = 'spotify_code_exchanged';
      if (sessionStorage.getItem(exchangedFlag)) {
        window.history.replaceState({}, document.title, REDIRECT_URI);
        sessionStorage.removeItem(KEY_CODE_VERIFIER);
        return;
      }

      (async () => {
        setLoading(true);
        try {
          const verifier = sessionStorage.getItem(KEY_CODE_VERIFIER);
          console.log('Exchanging code', { code, verifierLength: verifier?.length, REDIRECT_URI });
          if (!verifier) {
            console.warn('PKCE verifier missing on exchange; clearing exchanged flag and URL to allow retry.');
            sessionStorage.removeItem('spotify_code_exchanged');
            window.history.replaceState({}, document.title, REDIRECT_URI);
            setLoading(false);
            return;
          }

          sessionStorage.setItem(exchangedFlag, '1');

          const token = await exchangeCodeForToken(code, verifier, REDIRECT_URI);
          saveToken(token);
          initSpotifyClient(token.access_token);
          setConnected(true);
          await fetchTopTracks(tab);

          window.history.replaceState({}, document.title, REDIRECT_URI);
        } catch (err) {
          sessionStorage.removeItem(exchangedFlag);
          console.error('Error exchanging code', err);
          setError('Token exchange failed');
        } finally {
          setLoading(false);
          sessionStorage.removeItem(KEY_CODE_VERIFIER);
        }
      })();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function timeRangeForTab(t) {
    if (t === 'short') return 'short_term';
    if (t === 'medium') return 'medium_term';
    return 'long_term';
  }

  function tokenExpired(tokenData) {
    if (!tokenData?.expires_at) return false;
    return Date.now() >= new Date(tokenData.expires_at).getTime();
  }

  function saveToken(tokenData) {
    const expires_at = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : tokenData.expires_at || null;
    const normalized = { ...tokenData, expires_at };
    sessionStorage.setItem(KEY_TOKEN, JSON.stringify(normalized));
  }

  async function exchangeCodeForToken(code, code_verifier, redirect_uri) {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      code_verifier,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token exchange failed: ${res.status} ${txt}`);
    }
    return res.json();
  }

  async function refreshToken(refresh_token) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: CLIENT_ID,
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Refresh failed: ${res.status} ${txt}`);
    }
    return res.json();
  }

  function initSpotifyClient(token) {
    const s = new SpotifyWebApi();
    s.setAccessToken(token);
    spotifyRef.current = s;
  }

  async function fetchTopTracks(selectedTab = tab) {
    const s = spotifyRef.current;
    setError(null);
    if (!s) {
      setError('No Spotify client. Połącz najpierw konto.');
      return;
    }
    setLoading(true);
    try {
      const time_range = timeRangeForTab(selectedTab);
      const res = await s.getMyTopTracks({ limit: 20, time_range });
      setTracks(res.items || []);
    } catch (err) {
      console.error('fetch top tracks error', err);
      const stored = JSON.parse(sessionStorage.getItem(KEY_TOKEN) || '{}');
      if (err?.status === 401 && stored?.refresh_token) {
        try {
          const newToken = await refreshToken(stored.refresh_token);
          const merged = { ...stored, ...newToken };
          saveToken(merged);
          initSpotifyClient(merged.access_token);
          const res2 = await spotifyRef.current.getMyTopTracks({ limit: 20, time_range: timeRangeForTab(selectedTab) });
          setTracks(res2.items || []);
        } catch (e) {
          console.error('refresh during fetch failed', e);
          disconnect();
          setError('Błąd odświeżania tokenu');
        }
      } else {
        setError('Błąd pobierania top tracks');
      }
    } finally {
      setLoading(false);
    }
  }

  const connect = async () => {
    if (!CLIENT_ID) {
      console.error('REACT_APP_SPOTIFY_CLIENT_ID not set');
      return;
    }
    if (typeof CLIENT_ID !== 'string' || CLIENT_ID.trim().length !== 32) {
      console.error('CLIENT_ID appears invalid length:', CLIENT_ID?.length, 'value:', CLIENT_ID);
    }

    sessionStorage.removeItem('spotify_code_exchanged');
    sessionStorage.removeItem(KEY_CODE_VERIFIER);

    const verifier = randomString(128);
    const challenge = await createCodeChallenge(verifier);
    sessionStorage.setItem(KEY_CODE_VERIFIER, verifier);

    const scopeParam = SCOPES.replace(/ /g, '%20');

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: scopeParam,
      show_dialog: 'true',
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    console.log('Spotify auth params', { CLIENT_ID, REDIRECT_URI, scopeParam, code_challenge: challenge, verifierLength: verifier.length, authUrl });

    window.location.href = authUrl;
  };

  function disconnect() {
    sessionStorage.removeItem(KEY_TOKEN);
    sessionStorage.removeItem(KEY_CODE_VERIFIER);
    sessionStorage.removeItem('spotify_code_exchanged');
    window.history.replaceState({}, document.title, window.location.pathname);
    setConnected(false);
    setTracks([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingTrackId(null);
    setIsPlaying(false);
    spotifyRef.current = null;
  }

  const handleThumbnailClick = (track) => {
    const preview = track.preview_url;
    if (!preview) {
      window.open(track.external_urls?.spotify, '_blank', 'noopener');
      return;
    }

    if (playingTrackId === track.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => {
          console.warn('Audio play failed', e);
        });
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    const audio = new Audio(preview);
    audioRef.current = audio;
    audio.play().then(() => {
      setPlayingTrackId(track.id);
      setIsPlaying(true);
    }).catch(e => {
      console.warn('Audio play failed', e);
      setPlayingTrackId(null);
      setIsPlaying(false);
    });

    audio.onended = () => {
      setPlayingTrackId(null);
      setIsPlaying(false);
      audioRef.current = null;
    };
    audio.onerror = () => {
      console.warn('Audio error for track', track.id);
      setPlayingTrackId(null);
      setIsPlaying(false);
      audioRef.current = null;
    };
  };

  const onTabClick = async (t) => {
    setTab(t);
    await fetchTopTracks(t);
  };

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <h2>Ulubiona muzyka</h2>

      {!connected ? (
        <div style={{ marginTop: 20 }}>
          <p>Połącz aplikację ze Spotify, aby zobaczyć swoje najczęściej słuchane utwory.</p>
          <button className="btn btn-success" onClick={connect} disabled={loading}>
            {loading ? 'Ładowanie…' : 'Połącz z Spotify'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${tab === 'short' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onTabClick('short')}>Ostatni tydzień</button>
              <button className={`btn ${tab === 'medium' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onTabClick('medium')}>Ostatni miesiąc</button>
              <button className={`btn ${tab === 'long' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onTabClick('long')}>Rok</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-outline-secondary" onClick={() => fetchTopTracks(tab)} disabled={loading}>Odśwież</button>
              <button className="btn btn-danger" onClick={disconnect}>Rozłącz Spotify</button>
            </div>
          </div>

          {loading && <p>Ładowanie top utworów…</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && tracks.length === 0 && !error && <p>Brak danych do wyświetlenia.</p>}

          <div className="list-group">
            {tracks.map((t, idx) => (
              <div
                key={t.id}
                className="list-group-item d-flex align-items-center"
                style={{ cursor: 'default' }}
              >
                <div style={{ width: 64, height: 64, marginRight: 12, position: 'relative' }}>
                  <img
                    src={(t.album?.images && t.album.images[0] && t.album.images[0].url) || '/placeholder.png'}
                    alt={t.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                    onClick={() => handleThumbnailClick(t)}
                  />
                  {/* playing indicator */}
                  {playingTrackId === t.id && isPlaying && (
                    <div style={{
                      position: 'absolute', left: 6, top: 6, width: 18, height: 18, borderRadius: 4,
                      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10
                    }}>▶</div>
                  )}
                  {playingTrackId === t.id && !isPlaying && (
                    <div style={{
                      position: 'absolute', left: 6, top: 6, width: 18, height: 18, borderRadius: 4,
                      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10
                    }}>▌▌</div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{idx + 1}. {t.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {t.artists.map(a => a.name).join(', ')} · {t.album?.name} · {formatMs(t.duration_ms)}
                  </div>
                </div>

                <div style={{ marginLeft: 12, fontSize: 12, color: '#666' }}>
                  Popularność: {t.popularity ?? '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMs(ms = 0) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
