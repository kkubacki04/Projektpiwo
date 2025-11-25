import React from 'react';
import { useNavigate } from 'react-router-dom';
import MapLeaflet from '../components/MapLeaflet';

export default function Home({ user, goToProfile, goToMovies, goToMusic }) {
  const navigate = useNavigate();

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

            {/* Tutaj wstawiamy komponent mapy */}
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
              <div className="d-flex align-items-center gap-3 mb-2">
                <img src="/avatar.jpg" alt="avatar" className="rounded-circle" width="56" height="56" />
                <div>
                  <div className="fw-semibold">Kacper</div>
                  <div className="text-muted small">Fan taniego piwa · 21 lat</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">Krótki opis</div>
                <p id="profile-bio" className="mb-2 text-break">Lubię pić piwo.</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" id="editProfileBtn">Edytuj profil</button>
                  <button className="btn btn-outline-secondary btn-sm" id="editBioBtn">Edytuj opis</button>
                </div>
              </div>

              <div className="d-grid">
                <button className="btn btn-outline-primary btn-sm" onClick={handleGoToProfile}>Przejdź do profilu</button>
              </div>
            </div>
          </div>

          <div id="movies" className="card mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubione filmy</h3>
              <p className="small text-muted mb-2">Filmy, które możesz wykorzystać jako temat rozmowy przy stoliku</p>
              <ul className="list-unstyled mb-0">
                <li className="mb-1">Pulp Fiction · 1994</li>
                <li className="mb-1">Amélie · 2001</li>
                <li className="mb-1">La La Land · 2016</li>
              </ul>
              <div className="mt-3">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleGoToMovies}>Więcej</button>
              </div>
            </div>
          </div>

          <div id="music" className="card">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubiona muzyka</h3>
              <p className="small text-muted mb-2">Playlisty, które lubisz</p>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-light border text-dark">Indie</span>
                <span className="badge bg-light border text-dark">Rock</span>
                <span className="badge bg-light border text-dark">Elektronika</span>
              </div>
              <div className="mt-3">
                <button className="btn btn-outline-primary btn-sm" onClick={handleGoToMusic}>Edytuj</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="mt-4 mb-5 text-center text-muted small" />
    </div>
  );
}
