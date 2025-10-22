import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const forceCleanup = (modalId = 'loginModal') => {
    const modalEl = document.getElementById(modalId);
    if (modalEl && modalEl.classList.contains('show')) {
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
    }

    
    document.querySelectorAll(`.modal-backdrop[data-for="${modalId}"]`).forEach(el => el.remove());

    
    const anyOpen = document.querySelectorAll('.modal.show').length > 0;
    if (!anyOpen) {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    }
  };

  const hideModalAndWait = (modalId = 'loginModal', timeoutMs = 800) =>
    new Promise((resolve) => {
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return resolve();

      const bs = window.bootstrap;
      try {
        if (bs?.Modal) {
          const inst = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
          const onHidden = () => {
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
            setTimeout(() => {
              try { inst.dispose(); } catch (e) {}
              forceCleanup(modalId);
              resolve();
            }, 50);
          };
          modalEl.addEventListener('hidden.bs.modal', onHidden);
          inst.hide();

          setTimeout(() => {
            
            const hasOwnBackdrop = document.querySelectorAll(`.modal-backdrop[data-for="${modalId}"]`).length > 0;
            const anyBackdrop = document.querySelectorAll('.modal-backdrop').length > 0;
            const anyModalShown = document.querySelectorAll('.modal.show').length > 0;

            if (hasOwnBackdrop || (anyBackdrop && !anyModalShown)) {
              try { inst.dispose(); } catch (e) {}
              forceCleanup(modalId);
            }
            resolve();
          }, timeoutMs);
        } else {
          
          forceCleanup(modalId);
          resolve();
        }
      } catch (err) {
        forceCleanup(modalId);
        resolve();
      }
    });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return alert(error.message);
      }

      if (data?.session) {
        await hideModalAndWait('loginModal');
      } else {
        await hideModalAndWait('loginModal');
        alert('Potwierdź email jeśli wymagane. Sprawdź skrzynkę.');
      }
    } catch (err) {
      console.error('login error', err);
      alert(err.message || 'Błąd logowania');
    }
  };

  const openRegisterAfterClose = async () => {
    await hideModalAndWait('loginModal');
    const regEl = document.getElementById('registerModal');
    const bs = window.bootstrap;
    if (regEl && bs?.Modal) {
      const regInst = bs.Modal.getInstance(regEl) || new bs.Modal(regEl);
      regInst.show();
    } else if (regEl) {
      
      regEl.classList.add('show');
      regEl.style.display = 'block';
      document.body.classList.add('modal-open');
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      backdrop.setAttribute('data-for', 'registerModal');
      document.body.appendChild(backdrop);
    }
  };

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true" data-for="loginModal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Logowanie</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Zamknij"></button>
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
            <small className="text-muted">
              Nie masz konta?{' '}
              <button
                type="button"
                className="btn btn-link p-0 align-baseline"
                onClick={openRegisterAfterClose}
              >
                Zarejestruj się
              </button>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
