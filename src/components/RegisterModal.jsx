import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function isEmailVerified(user) {
  const meta = user?.raw_user_meta_data ?? {};
  return (
    meta.email_verified === true ||
    (typeof meta.email_verified === 'string' && meta.email_verified.toLowerCase() === 'true') ||
    !!user?.confirmed_at
  );
}

export default function RegisterModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const subscriptionRef = useRef(null);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
    setSuccessMsg(null);
    setWaitingForVerification(false);
    setLoading(false);
  };

  const cleanupBackdrop = () => {
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  };

  const closeModal = () => {
    const modalEl = document.getElementById('registerModal');
    if (!modalEl) return;
    const bs = window.bootstrap;
    try {
      if (bs?.Modal) {
        const inst = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
        inst.hide();
      } else {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        cleanupBackdrop();
      }
    } catch (e) {
      cleanupBackdrop();
    }
  };

  useEffect(() => {
    const handle = async (_event, session) => {
      if (!session) return;
      const { data: fetched, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        console.warn('getUserError', getUserError);
        return;
      }
      const user = fetched?.user ?? session.user;
      if (!user) return;
      if (!isEmailVerified(user)) {
        setWaitingForVerification(true);
        setLoading(true);
        setSuccessMsg('Oczekiwanie na weryfikację e‑mail...');
        return;
      }
      setWaitingForVerification(false);
      setLoading(false);
      setSuccessMsg('E‑mail zweryfikowany.');
      setTimeout(() => {
        clearForm();
        closeModal();
      }, 600);
    };

    console.log('RegisterModal mounted, subscribing to auth changes');
    const { data: subscription } = supabase.auth.onAuthStateChange(handle);
    subscriptionRef.current = subscription;
    return () => {
      subscriptionRef.current?.unsubscribe?.();
      console.log('RegisterModal unmounted, unsubscribed auth listener');
    };
  }, []);

  const handleRegister = async (e) => {
    console.log('handleRegister invoked');
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password || !firstName || !lastName) {
      setError('Email, imię i nazwisko oraz hasło są wymagane');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    setLoading(true);

    try {
      

     
      const { data, error } = await supabase.auth.signUp(
        { email, password },
        {
          options: { data: { first_name: firstName, last_name: lastName } }
        }
      );

      console.log('signup result', { data, error });

      if (error) {
        setError(error.message || 'Błąd rejestracji');
        setLoading(false);
        return;
      }

      setSuccessMsg('Wysłano e‑mail potwierdzający. Sprawdź skrzynkę.');
      setWaitingForVerification(true);
      setLoading(false);
    } catch (err) {
      console.error('unexpected signup error', err);
      setError(err?.message || 'Błąd rejestracji');
      setLoading(false);
      setWaitingForVerification(false);
    }
  };

  return (
    <div
      className="modal fade"
      id="registerModal"
      tabIndex="-1"
      aria-labelledby="registerModalLabel"
      aria-hidden="true"
      data-bs-backdrop={waitingForVerification ? 'static' : undefined}
      data-bs-keyboard={waitingForVerification ? 'false' : undefined}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="registerModalLabel">Rejestracja</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Zamknij"
              onClick={() => {
                if (waitingForVerification) return;
                const modalEl = document.getElementById('registerModal');
                if (!modalEl) return;
                const bs = window.bootstrap;
                try {
                  if (bs?.Modal) {
                    const inst = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
                    inst.hide();
                  } else {
                    modalEl.classList.remove('show');
                    modalEl.style.display = 'none';
                    cleanupBackdrop();
                  }
                } catch (e) {
                  cleanupBackdrop();
                }
              }}
            />
          </div>

          <form onSubmit={handleRegister}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <div className="mb-3">
                <label htmlFor="regFirstName" className="form-label">Imię</label>
                <input id="regFirstName" className="form-control" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>

              <div className="mb-3">
                <label htmlFor="regLastName" className="form-label">Nazwisko</label>
                <input id="regLastName" className="form-control" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>

              <div className="mb-3">
                <label htmlFor="regEmail" className="form-label">Email</label>
                <input id="regEmail" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="mb-3">
                <label htmlFor="regPassword" className="form-label">Hasło</label>
                <input id="regPassword" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div className="form-text">Minimum 6 znaków</div>
              </div>

              {waitingForVerification && (
                <div className="d-flex align-items-center mt-2">
                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  <div>Oczekiwanie na weryfikację e‑mail... modal pozostanie otwarty</div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => { if (!waitingForVerification) clearForm(); }}>Anuluj</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Trwa rejestracja...' : 'Zarejestruj'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
 