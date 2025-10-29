import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import LoginModal from '../components/loginModal';
import RegisterModal from '../components/RegisterModal';
import '../index.css';

function AuthLogger({ onAuthChange }) {
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && mounted) {
        onAuthChange?.(data?.session?.user ?? null);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      onAuthChange?.(session?.user ?? null);
    });

    return () => {
      mounted = false;
      if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
    };
  }, [onAuthChange]);

  return null;
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && mounted) {
        setUser(data?.session?.user ?? null);
      }
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
  };

  return (
    <>
      <AuthLogger onAuthChange={setUser} />

      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top border-bottom shadow-sm">
        <div className="container">
          <a className="navbar-brand fw-bold d-flex align-items-center" href="/">
            <img src="/piwo.png" alt="Kufel piwa" width="28" height="28" className="me-2" />
            P.I.W.O Spotkajmy się na piwo
          </a>

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
                <a className="nav-link" href="/Profil.js">Profil</a>
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
              <button className="btn btn-outline-danger" onClick={handleLogout}>Wyloguj</button>
            )}
          </div>
        </header>
      </div>

      <LoginModal />
      <RegisterModal />
    </>
  );
}

export default App;