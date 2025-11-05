import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onOpenLogin,onLogout }) {
  //console.log('Navbar mount props', { user, onOpenLogin, onLogoutType: typeof onLogout, onLogout });

  const handleClick = async () => {
    console.log('clicked'); 
    if (typeof onLogout !== 'function') {
      console.warn('onLogout is not a function', onLogout);
      return;
    }
    try {
      await onLogout();
      console.log('onLogout resolved');
    } catch (err) {
      console.error('onLogout threw:', err);
    }
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top border-bottom shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
          <img src="/piwo.png" alt="Kufel piwa" width="28" height="28" className="me-2" />
          P.I.W.O Spotkajmy się na piwo
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            {!user ? (
            <li className="nav-item">
              <button type="button" className="nav-link btn btn-link" onClick={onOpenLogin}>Logowanie</button>
            </li>
            ) : (
              <>
            <li className="nav-item"><Link className="nav-link" to="/FavMovies">Ulubione filmy</Link></li>
            <li className="nav-item"><a className="nav-link" href="#music">Ulubiona muzyka</a></li>
            <li className="nav-item"><a className="nav-link" href="#recent">Ostatnie spotkania</a></li>
            <li className="nav-item"><Link className="nav-link" to="/profile">Profil</Link></li>
            <li className="nav-item">
              <button type="button" className="btn btn-outline-danger" onClick={handleClick}>Wyloguj</button>
              </li>
              </>
              )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
