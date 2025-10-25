import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function RegisterModal() {
  
  useEffect(() => {
    const handle = async (_event, session) => {
      if (!session) return;

      
      const { data: fetched, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        console.warn('getUser error', getUserError);
        return;
      }
      const user = fetched?.user ?? session.user;
      if (!user) return;

      const meta = user.raw_user_meta_data ?? {};
      const emailVerified =
        meta.email_verified === true ||
        (typeof meta.email_verified === 'string' && meta.email_verified.toLowerCase() === 'true') ||
        !!user.confirmed_at;

      if (!emailVerified) return;

      try {
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: meta.full_name ?? null,
            email: user.email ?? meta.email ?? null,
            created_at: new Date().toISOString()
          }, { returning: 'minimal' });

        if (error) console.warn('create profile after verify error', error);
        else console.debug('profile created (or existed) for', user.id);
      } catch (e) {
        console.error('unexpected error creating profile after verify', e);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(handle);
    return () => subscription?.unsubscribe?.();
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMsg(null);
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Email i hasło są wymagane');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
        { email, password },
        { data: { full_name: displayName || null } }
      );
      console.log('signUp response', signUpData, signUpError);
      if (signUpError) throw signUpError;

      const user = signUpData?.user ?? null;

      if (user) {
        const meta = user.raw_user_meta_data ?? {};
        const emailVerified =
          meta.email_verified === true ||
          (typeof meta.email_verified === 'string' && meta.email_verified.toLowerCase() === 'true') ||
          !!user.confirmed_at;

        if (emailVerified) {
          const { error: insertErr } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: displayName || meta.full_name || null,
              created_at: new Date().toISOString()
            }, { returning: 'minimal' });

          if (insertErr) {
            console.warn('profiles insert error', insertErr);
            setError('Profil nie został utworzony automatycznie.');
          } else {
            setSuccessMsg('Konto utworzone i profil dodany.');
          }
        } else {
          setSuccessMsg('Wysłano e‑mail potwierdzający. Profil zostanie utworzony po weryfikacji e‑mail.');
        }
      } else {
        setSuccessMsg('Wysłano e‑mail potwierdzający (jeśli wymagane). Sprawdź skrzynkę.');
      }

      clearForm();
      setTimeout(() => closeModal(), 700);
    } catch (err) {
      console.error('register error', err);
      setError(err?.message || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade" id="registerModal" tabIndex="-1" aria-labelledby="registerModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="registerModalLabel">Rejestracja</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Zamknij"
              onClick={() => {
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
                    document.body.classList.remove('modal-open');
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                  }
                } catch (e) {
                  document.body.classList.remove('modal-open');
                  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                }
              }}
            />
          </div>

          <form onSubmit={handleRegister}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <div className="mb-3">
                <label htmlFor="regDisplayName" className="form-label">Imię i nazwisko</label>
                <input id="regDisplayName" className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Opcjonalnie" />
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
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={clearForm}>Anuluj</button>
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
