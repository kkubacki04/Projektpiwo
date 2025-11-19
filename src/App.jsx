import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import LoginModal from './components/loginModal';
import RegisterModal from './components/RegisterModal';
import Home from './pages/home';
import Profil from './pages/Profil';
import FavMovies from './pages/FavMovies';
import FavMusic from './pages/FavMusic';

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('signOut error', error);
        return;
      }
      console.log('User requested signOut');
      navigate('/');
    } catch (err) {
      console.error('Unexpected logout error', err);
    }
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
  const goToMovies = () => {
    closeBootstrapModals();
    navigate('/FavMovies');
  };  
  const goToMusic = () => {
    closeBootstrapModals();
    navigate('/FavMusic');
  };

  const openLogin = () => {
    const modal = document.querySelector('#loginModal');
    if (modal) {
      const bs = window.bootstrap;
      const inst = bs ? bs.Modal.getOrCreateInstance(modal) : null;
      inst?.show();
    }
  };

  return (
    <>
     <AuthLogger onAuthChange={setUser} />
      <Navbar user={user} onLogout={handleLogout} onOpenLogin={openLogin} />


      <LoginModal />
      <RegisterModal />

    
        <header>
        </header>

        <Routes>
          <Route path="/" element={<Home user={user} goToProfile={goToProfile} goToMovies={goToMovies} goToMusic={goToMusic} />} />
          <Route path="/profile" element={<Profil user={user} />} />
          <Route path="/FavMovies" element={<FavMovies user={user} />} />
          <Route path="/FavMusic" element={<FavMusic user={user} />} />
        </Routes>
      
    </>
  );
}
