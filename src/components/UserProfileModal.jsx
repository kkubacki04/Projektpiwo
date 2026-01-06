import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function UserProfileModal({ show, onClose, userId }) {
  const [profile, setProfile] = useState(null);
  const [movies, setMovies] = useState([]);
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && userId) {
      fetchUserDetails();
    } else {
      setProfile(null);
      setMovies([]);
      setMusic([]);
    }
  }, [show, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const safetyTimer = setTimeout(() => setLoading(false), 5000);

      await supabase.auth.getSession(); 

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(prof);

      const { data: mov } = await supabase.from('favorite_movies').select('*').eq('user_id', userId);
      setMovies(mov || []);

      const { data: mus } = await supabase.from('favorite_music').select('*').eq('user_id', userId).limit(5);
      setMusic(mus || []);

      clearTimeout(safetyTimer);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;


  const interests = profile?.interests || [];

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Profil uczestnika</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <p>Ładowanie...</p>
            ) : profile ? (
              <>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <img 
                    src={profile.avatar_url || '/avatar.jpg'} 
                    alt="avatar" 
                    className="rounded-circle border" 
                    width="80" 
                    height="80" 
                    style={{ objectFit: 'cover' }} 
                  />
                  <div>
                    <h4 className="mb-0">{profile.first_name} {profile.last_name}</h4>
                    <span className="badge bg-secondary">{profile.relationship_status?.replace('_', ' ') || 'Singiel'}</span>
                  </div>
                </div>

                {profile.description && (
                  <div className="mb-3">
                    <strong>O mnie:</strong>
                    <p className="text-muted">{profile.description}</p>
                  </div>
                )}

                <div className="mb-3">
                  <strong>Zainteresowania:</strong>
                  {interests.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {interests.map((int, i) => (
                        <span key={i} className="badge bg-light text-dark border fw-normal">{int}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="small text-muted">Brak podanych zainteresowań.</p>
                  )}
                </div>

                <hr />

                <div className="mb-3">
                  <strong>Ulubione filmy:</strong>
                  {movies.length > 0 ? (
                    <ul className="small text-muted ps-3">
                      {movies.map(m => <li key={m.id}>{m.title}</li>)}
                    </ul>
                  ) : <p className="small text-muted">Brak danych.</p>}
                </div>

                <div>
                  <strong>Ulubiona muzyka:</strong>
                  {music.length > 0 ? (
                    <ul className="small text-muted ps-3">
                      {music.map(m => <li key={m.id}>{m.artist} - {m.title}</li>)}
                    </ul>
                  ) : <p className="small text-muted">Brak danych.</p>}
                </div>
              </>
            ) : (
              <p>Nie udało się pobrać profilu.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}