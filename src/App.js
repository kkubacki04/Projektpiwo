import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import LoginModal from './components/loginModal';
import RegisterModal from './components/RegisterModal';
import './index.css';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Profil from './pages/Profil';

function AuthLogger({ onAuthChange }) {
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('auth.getSession error', error);
      } else if (mounted) {
        console.log('AuthLogger initial session:', data?.session ?? null);
        onAuthChange?.(data?.session?.user ?? null);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ?? null);
      onAuthChange?.(session?.user ?? null);
    });

    return () => {
      mounted = false;
      if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
    };
  }, [onAuthChange]);

  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('auth.getSession error', error);
        return;
      }
      if (!mounted) return;
      setUser(data?.session?.user ?? null);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    console.log('User requested signOut');
    navigate('/'); // optional redirect after logout
  };

  const closeBootstrapModals = () => {
    const bs = window.bootstrap;
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach((modalEl) => {
      try {
        if (bs?.Modal) {
          const inst = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
          inst.hide();
        } else {
          modalEl.classList.remove('show');
          modalEl.style.display = 'none';
        }
      } catch (_) {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
      }
    });
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  };

  const goToProfile = () => {
    closeBootstrapModals();
    navigate('/profile');
  };

  return (
    <>
      <AuthLogger onAuthChange={setUser} />

      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top border-bottom shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
            <img src="/piwo.png" alt="Kufel piwa" width="28" height="28" className="me-2" />
            P.I.W.O Spotkajmy się na piwo
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <Link className="nav-link" to="/profile">Profil</Link>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link btn btn-link" data-bs-toggle="modal" data-bs-target="#loginModal">Logowanie</button>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#movies">Ulubione filmy</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#music">Ulubiona muzyka</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#recent">Ostatnie spotkania</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 90 }}>
        <header className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3">P.I.W.O</h1>
          <div>
            {!user ? (
              <button className="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Zaloguj</button>
            ) : (
              <>
                <button className="btn btn-outline-primary me-2" onClick={goToProfile}>Mój profil</button>
                <button className="btn btn-outline-danger" onClick={handleLogout}>Wyloguj</button>
              </>
            )}
          </div>
        </header>

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
              <div id="map" role="region" style={{ width: '100%', height: 560, borderRadius: '.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}></div>
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
                  <button className="btn btn-outline-primary btn-sm" onClick={goToProfile}>Przejdź do profilu</button>
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
                  <a className="btn btn-sm btn-outline-secondary" href="#movies">Więcej</a>
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
                  <a className="btn btn-sm btn-outline-secondary" href="#music">Edytuj</a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-4 mb-5 text-center text-muted small">
        </footer>
      </div>

      <LoginModal />
      <RegisterModal />

      <Routes>
        <Route path="/" element={<div />} />
        <Route path="/profile" element={<Profil />} />
      </Routes>
    </>
  );
}
