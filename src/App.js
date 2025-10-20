import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import LoginModal from './components/loginModal';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="container mt-4">
      <header className="d-flex justify-content-between align-items-center">
        <h1>P.I.W.O</h1>
        <div>
          {!user ? (
            <button className="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Zaloguj</button>
          ) : (
            <button className="btn btn-outline-danger" onClick={handleLogout}>Wyloguj</button>
          )}
        </div>
      </header>

      <main className="mt-5">
        {user ? <p>Witaj, {user.email}</p> : <p>Jesteś niezalogowany</p>}
      </main>

      <LoginModal />
    </div>
  );
}

export default App;
