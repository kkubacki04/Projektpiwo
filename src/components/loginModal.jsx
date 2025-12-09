import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const forceCloseModal = () => {
    const modalEl = document.getElementById('loginModal');
    if (modalEl) {
      const bs = window.bootstrap;
      if (bs && bs.Modal) {
        const instance = bs.Modal.getOrCreateInstance(modalEl);
        instance.hide();
      }
      
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
    }

    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        alert(error.message);
        return;
      }

      if (data?.session) {
        forceCloseModal();
      } else {
        forceCloseModal();
        alert('Sprawdź email w celu potwierdzenia konta.');
      }
    } catch (err) {
      console.error(err);
      alert('Błąd logowania');
    }
  };

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Logowanie</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Zamknij"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Hasło</label>
                <input className="form-control" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-danger">Zaloguj</button>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <small className="text-muted">
              Nie masz konta? <button className="btn btn-link p-0" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#registerModal">Zarejestruj się</button>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}