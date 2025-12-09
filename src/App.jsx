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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      if (location.pathname === '/profile') return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();

        if (!data || !data.first_name) {
          navigate('/profile');
        }
      } catch (err) {
        if (err.code !== 'PGRST116') {
          console.error(err);
        } else {
           navigate('/profile');
        }
      }
    };

    checkProfile();
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
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