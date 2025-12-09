import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapLeaflet from '../components/MapLeaflet';
import { supabase } from '../supabaseClient';

export default function Home({ user, goToProfile, goToMovies, goToMusic }) {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [favMovies, setFavMovies] = useState([]);
  const [favMusic, setFavMusic] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, description')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const { data: moviesData } = await supabase
        .from('favorite_movies')
        .select('*')
        .eq('user_id', user.id);
      
      if (moviesData) setFavMovies(moviesData);

      const { data: musicData } = await supabase
        .from('favorite_music')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
      
      if (musicData) setFavMusic(musicData);

    } catch (error) {
      console.error('Błąd pobierania danych:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProfile = () => {
    if (typeof goToProfile === 'function') {
      goToProfile();
    } else {
      navigate('/profile');
    }
  };
  const handleGoToMovies = () => {
    if (typeof goToMovies === 'function') {
      goToMovies();
    } else {
      navigate('/FavMovies');
    }
  };
  const handleGoToMusic = () => {
    if (typeof goToMusic === 'function') {
      goToMusic();
    } else {
      navigate('/FavMusic');
    }
  };

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
    : 'Użytkownik';

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <section className="hero p-4 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h1 className="h3 mb-2">Znajdź towarzystwo na piwo w Krakowie</h1>
            <p className="text-muted mb-2">Wybierz miejsce na mapie, zobacz kto planuje przyjść i dołącz do spotkania.</p>
            <div className="d-flex gap-2">
              <a href="#mapSection" className="btn btn-danger">Otwórz mapę</a>
              <a href="#recent" className="btn btn-outline-secondary">Ostatnie spotkania</a>
            </div>
          </div>
        </div>
      </section>

      <div className="row">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="badge bg-light text-dark border">Kraków</span>{' '}
              <span className="badge bg-light text-dark border">Dziś</span>
            </div>
            <div className="d-flex gap-2">
              <select className="form-select form-select-sm" style={{ width: 160 }}>
                <option>Sortuj: Najbliżej</option>
                <option>Popularne</option>
                <option>Ocena</option>
              </select>
              <button className="btn btn-outline-secondary btn-sm" id="centerBtn">Centruj</button>
            </div>
          </div>

          <section id="mapSection">
            <h2 className="h5 mb-3">Mapa barów w Krakowie</h2>
            <MapLeaflet />
            <p className="small text-muted mt-2">Kliknij marker, aby otworzyć formularz dołączenia do spotkania.</p>
          </section>

          <hr className="my-4" />

          <section id="recent">
            <h2 className="h5 mb-3">Ostatnie spotkania</h2>
            <ul className="list-group">
              <li className="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold">Spotkanie: Browar Kazi</div>
                  3 dni temu · 8 uczestników · muzyka: indie
                </div>
                <span className="badge bg-success rounded-pill">Zakończone</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold">Piwo i film: Stary Browar</div>
                  6 dni temu · 5 uczestników · film: komedia
                </div>
                <span className="badge bg-primary rounded-pill">Relacja</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold">Mecz i piwo: Piwnica Pod Halą</div>
                  10 dni temu · 12 uczestników · wydarzenie sportowe
                </div>
                <span className="badge bg-secondary rounded-pill">Archiwum</span>
              </li>
            </ul>
          </section>
        </div>

        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Profil</h3>
              {user ? (
                <>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <img src="/avatar.jpg" alt="avatar" className="rounded-circle" width="56" height="56" />
                    <div>
                      <div className="fw-semibold">{displayName}</div>
                      <div className="text-muted small">Fan taniego piwa</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="fw-semibold mb-1">Krótki opis</div>
                    <p id="profile-bio" className="mb-2 text-break">
                      {profile?.description || 'Brak opisu.'}
                    </p>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-primary btn-sm" onClick={handleGoToProfile}>Edytuj profil</button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted small">Zaloguj się, aby zobaczyć swój profil.</p>
              )}
            </div>
          </div>

          <div id="movies" className="card mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubione filmy</h3>
              <p className="small text-muted mb-2">Filmy, które możesz wykorzystać jako temat rozmowy przy stoliku</p>
              
              {user && favMovies.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {favMovies.map((movie) => (
                    <li key={movie.id} className="mb-1">
                      {movie.title} {movie.release_year ? `· ${movie.release_year}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-muted">Brak ulubionych filmów.</p>
              )}

              <div className="mt-3">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleGoToMovies}>Zarządzaj filmami</button>
              </div>
            </div>
          </div>

          <div id="music" className="card">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubiona muzyka (Top 5)</h3>
              <p className="small text-muted mb-2">Najczęściej słuchane w tym roku</p>
              
              {user && favMusic.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {favMusic.map((track) => (
                    <li key={track.id} className="mb-1 d-flex justify-content-between align-items-center">
                      <span>{track.artist} - {track.title}</span>
                      {track.genre && <span className="badge bg-light text-dark border" style={{fontSize: '0.7em'}}>{track.genre}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-muted">Brak ulubionych utworów.</p>
              )}

              <div className="mt-3">
                <button className="btn btn-outline-primary btn-sm" onClick={handleGoToMusic}>Edytuj / Pobierz ze Spotify</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="mt-4 mb-5 text-center text-muted small" />
    </div>
  );
}