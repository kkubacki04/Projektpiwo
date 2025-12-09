import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import LoginModal from './components/loginModal';
import RegisterModal from './components/RegisterModal';
import Home from './pages/home';
import Profil from './pages/Profil';
import FavMovies from './pages/FavMovies';
import FavMusic from './pages/FavMusic';

export default function App() {
  const [user, setUser] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [profileChecked, setProfileChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const checkProfileCompletion = async (currentUser) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', currentUser.id)
        .single();

      if (!data || !data.first_name) {
        if (location.pathname !== '/profile') {
          navigate('/profile');
        }
      }
      setProfileChecked(true);
    } catch (err) {
      console.error('Błąd sprawdzania profilu:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) checkProfileCompletion(currentUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        checkProfileCompletion(currentUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Błąd wylogowania (Supabase):', err);
    }
    navigate('/');
  };

  const closeBootstrapModals = () => {
    const bs = window.bootstrap;
    if (!bs) return;
    
    document.querySelectorAll('.modal.show').forEach((modalEl) => {
      const inst = bs.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    });
    
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
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
    if (modal && window.bootstrap) {
      const inst = window.bootstrap.Modal.getOrCreateInstance(modal);
      inst.show();
    }
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} onOpenLogin={openLogin} />
      <LoginModal />
      <RegisterModal />

      <Routes>
        <Route path="/" element={<Home user={user} goToProfile={goToProfile} goToMovies={goToMovies} goToMusic={goToMusic} />} />
        <Route path="/profile" element={<Profil user={user} />} />
        <Route path="/FavMovies" element={<FavMovies user={user} />} />
        <Route path="/FavMusic" element={<FavMusic user={user} />} />
      </Routes>
    </>
  );
}