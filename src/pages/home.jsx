import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapLeaflet from '../components/MapLeaflet';
import CreateMeetingModal from '../components/CreateMeetingModal';
import UserProfileModal from '../components/UserProfileModal';
import { supabase } from '../supabaseClient';

export default function Home({ user, goToProfile, goToMovies, goToMusic }) {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [favMovies, setFavMovies] = useState([]);
  const [favMusic, setFavMusic] = useState([]);
  
  const [meetings, setMeetings] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeetingData, setNewMeetingData] = useState(null);

  const [viewProfileId, setViewProfileId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchMyMeetings();
    }
    fetchPublicMeetings();
  }, [user]);

  const fetchUserData = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);

      const { data: mData } = await supabase.from('favorite_movies').select('*').eq('user_id', user.id);
      if (mData) setFavMovies(mData);

      const { data: muData } = await supabase.from('favorite_music').select('*').eq('user_id', user.id).limit(5);
      if (muData) setFavMusic(muData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPublicMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            profiles (id, first_name, last_name, avatar_url)
          )
        `)
        .eq('is_public', true)
        .gte('meeting_time', new Date().toISOString());

      if (error) throw error;
      
      if (data) {
        const formatted = data.map(m => {
          const participants = m.meeting_participants
            ? m.meeting_participants.map(mp => mp.profiles).filter(p => p !== null)
            : [];
            
          return {
            ...m,
            participants,
            participants_count: participants.length
          };
        });
        setMeetings(formatted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('meeting_id, meetings(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        const upcoming = data
          .map(item => item.meetings)
          .filter(m => m && new Date(m.meeting_time) > new Date())
          .sort((a, b) => new Date(a.meeting_time) - new Date(b.meeting_time));
          
        setMyMeetings(upcoming);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAtBar = (data) => {
    if (!user) return alert('Zaloguj się, aby zorganizować spotkanie.');
    setNewMeetingData(data);
    setShowCreateModal(true);
  };

  const handleJoinMeeting = async (meetingId) => {
    if (!user) return alert('Musisz być zalogowany, aby dołączyć.');
    
    try {
      const { error } = await supabase.from('meeting_participants').insert({
        meeting_id: meetingId,
        user_id: user.id
      });

      if (error) {
        if (error.code === '23505') {
          alert('Już bierzesz udział w tym spotkaniu.');
        } else {
          throw error;
        }
      } else {
        alert('Dołączyłeś do spotkania!');
        fetchPublicMeetings();
        fetchMyMeetings();
      }
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd podczas dołączania.');
    }
  };

  const handleGoToProfile = () => {
    if (typeof goToProfile === 'function') goToProfile();
    else navigate('/profile');
  };
  const handleGoToMovies = () => {
    if (typeof goToMovies === 'function') goToMovies();
    else navigate('/FavMovies');
  };
  const handleGoToMusic = () => {
    if (typeof goToMusic === 'function') goToMusic();
    else navigate('/FavMusic');
  };

  const displayName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Użytkownik';
  const avatarSrc = profile?.avatar_url || '/avatar.jpg';

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <section className="hero p-4 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h1 className="h3 mb-2">Znajdź towarzystwo na piwo w Krakowie</h1>
            <p className="text-muted mb-2">Wybierz lokal na mapie i kliknij "Zorganizuj spotkanie", aby zaprosić innych.</p>
          </div>
        </div>
      </section>

      <div className="row">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div><span className="badge bg-light text-dark border">Kraków</span></div>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchPublicMeetings()}>Odśwież mapę</button>
          </div>

          <section id="mapSection" style={{ position: 'relative' }}>
            <MapLeaflet 
              meetings={meetings} 
              user={user} 
              onJoin={handleJoinMeeting} 
              onCreateClick={handleCreateAtBar}
              onViewProfile={(id) => setViewProfileId(id)}
            />
            <p className="small text-muted mt-2">
              Legenda: 
              <span style={{color: 'red', fontWeight: 'bold'}}> 🔴 Bar</span>, 
              <span style={{color: 'blue', fontWeight: 'bold'}}> 🔵 Pub</span>, 
              <span style={{color: 'purple', fontWeight: 'bold'}}> 🟣 Spotkanie</span>, 
              <span style={{color: '#c5a300', fontWeight: 'bold'}}> 🟡 Klub nocny</span>
            </p>
          </section>

          <CreateMeetingModal 
            show={showCreateModal} 
            onClose={() => setShowCreateModal(false)}
            lat={newMeetingData?.lat}
            lng={newMeetingData?.lng}
            venueName={newMeetingData?.name}
            user={user}
            onMeetingCreated={() => {
              fetchPublicMeetings();
              fetchMyMeetings();
            }}
          />

          <UserProfileModal 
            show={!!viewProfileId} 
            onClose={() => setViewProfileId(null)} 
            userId={viewProfileId} 
          />

          <hr className="my-4" />

          <section id="my-meetings" className="mb-4">
            <h2 className="h5 mb-3">Twoje nadchodzące spotkania</h2>
            {user && myMeetings.length > 0 ? (
              <ul className="list-group">
                {myMeetings.map(m => (
                  <li key={m.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{m.title}</strong>
                      <div className="small text-muted">
                        📅 {new Date(m.meeting_time).toLocaleString()} · {m.description || 'Brak opisu'}
                      </div>
                    </div>
                    <span className="badge bg-primary rounded-pill">Biorę udział</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Nie jesteś zapisany na żadne nadchodzące spotkania.</p>
            )}
          </section>
        </div>

        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Twój Profil</h3>
              {user ? (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <img 
                      src={avatarSrc} 
                      alt="avatar" 
                      className="rounded-circle border" 
                      width="56" 
                      height="56" 
                      style={{ objectFit: 'cover' }} 
                    />
                    <div>
                      <div className="fw-semibold">{displayName}</div>
                      <div className="text-muted small">Fan taniego piwa</div>
                    </div>
                  </div>
                  <button className="btn btn-outline-primary btn-sm w-100" onClick={handleGoToProfile}>Edytuj profil</button>
                </>
              ) : (
                <p className="text-muted small">Zaloguj się, aby zobaczyć profil.</p>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubione filmy</h3>
              {favMovies.length > 0 ? (
                <ul className="list-unstyled mb-0 small">
                  {favMovies.map(m => <li key={m.id} className="mb-1">🎥 {m.title} ({m.release_year})</li>)}
                </ul>
              ) : <p className="small text-muted">Brak filmów.</p>}
              <button className="btn btn-sm btn-outline-secondary mt-3 w-100" onClick={handleGoToMovies}>Zarządzaj</button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="h6 mb-2">Ulubiona muzyka</h3>
              {favMusic.length > 0 ? (
                <ul className="list-unstyled mb-0 small">
                  {favMusic.map(t => <li key={t.id} className="mb-1">🎵 {t.artist} - {t.title}</li>)}
                </ul>
              ) : <p className="small text-muted">Brak muzyki.</p>}
              <button className="btn btn-sm btn-outline-secondary mt-3 w-100" onClick={handleGoToMusic}>Zarządzaj</button>
            </div>
          </div>
        </aside>
      </div>
      
      <footer className="mt-5 mb-3 text-center text-muted small">
        © 2025 P.I.W.O - Projekt Studencki
      </footer>
    </div>
  );
}