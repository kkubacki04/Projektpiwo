import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    const modalEl = document.getElementById('loginModal');
    const bsModal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
bsModal.hide();

    bsModal.hide();
  };

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Logowanie</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <form id="loginForm" onSubmit={handleLogin} noValidate>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" placeholder="twój@adres.pl" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Hasło</label>
                <input className="form-control" type="password" placeholder="Hasło" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="rememberCheck" />
                <label className="form-check-label" htmlFor="rememberCheck">Zapamiętaj mnie</label>
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-danger">Zaloguj</button>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <small className="text-muted">Nie masz konta? Zarejestruj się.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
