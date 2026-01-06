import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapLeaflet from '../components/MapLeaflet';
import CreateMeetingModal from '../components/CreateMeetingModal';
import UserProfileModal from '../components/UserProfileModal';
import Notification from '../components/Notification';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../supabaseClient';

export default function Home({ user, goToProfile, goToMovies, goToMusic }) {
  const navigate = useNavigate();
  

  const [profile, setProfile] = useState(null);
  const [favMovies, setFavMovies] = useState([]);
  const [favMusic, setFavMusic] = useState([]);
  
  const [meetings, setMeetings] = useState([]); 
  const [myMeetings, setMyMeetings] = useState([]); 
  const [myPastMeetings, setMyPastMeetings] = useState([]); 
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeetingData, setNewMeetingData] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null);

  const [notification, setNotification] = useState({ message: '', type: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, meetingId: null });

  const showNotify = (msg, type = 'success') => {
    setNotification({ message: msg, type });
  };

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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            profiles (id, first_name, last_name, avatar_url)
          )
        `)
        .eq('is_public', true)
        .gte('meeting_time', yesterday.toISOString());

      if (error) throw error;
      
      if (data) {
        const now = new Date();
        const validMeetings = data.filter(m => new Date(m.meeting_time) > now);

        const formatted = validMeetings.map(m => {
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
        .select(`
          meeting_id,
          meetings (
            *,
            meeting_participants (
              profiles (id, first_name, last_name, avatar_url)
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        const now = new Date();
        const all = data.map(item => item.meetings).filter(m => m);

        const upcoming = all
          .filter(m => new Date(m.meeting_time) > now)
          .sort((a, b) => new Date(a.meeting_time) - new Date(b.meeting_time));

        const past = all
          .filter(m => new Date(m.meeting_time) <= now)
          .sort((a, b) => new Date(b.meeting_time) - new Date(a.meeting_time)); 
          
        setMyMeetings(upcoming);
        setMyPastMeetings(past);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAtBar = (data) => {
    if (!user) {
      showNotify('Zaloguj się, aby zorganizować spotkanie.', 'error');
      return;
    }
    
    if (myMeetings.length > 0) {
      showNotify('Masz już zaplanowane spotkanie! Musisz je opuścić, aby utworzyć nowe.', 'error');
      return;
    }

    setNewMeetingData(data);
    setShowCreateModal(true);
  };

  const handleJoinMeeting = async (meetingId) => {
    if (!user) {
      showNotify('Musisz być zalogowany, aby dołączyć.', 'error');
      return;
    }

    if (myMeetings.length > 0) {
      showNotify('Bierzesz już udział w innym spotkaniu! Opuść je najpierw.', 'error');
      return;
    }
    
    try {
      const { error } = await supabase.from('meeting_participants').insert({
        meeting_id: meetingId,
        user_id: user.id
      });

      if (error) {
        if (error.code === '23505') {
          showNotify('Już bierzesz udział w tym spotkaniu.', 'error');
        } else {
          throw error;
        }
      } else {
        showNotify('Dołączyłeś do spotkania!', 'success');
        fetchPublicMeetings();
        fetchMyMeetings();
      }
    } catch (err) {
      console.error(err);
      showNotify('Wystąpił błąd podczas dołączania.', 'error');
    }
  };

  const confirmLeaveMeeting = (meetingId) => {
    setConfirmModal({ show: true, meetingId });
  };

  const executeLeaveMeeting = async () => {
    const meetingId = confirmModal.meetingId;
    setConfirmModal({ show: false, meetingId: null });

    if (!user || !meetingId) return;

    try {
        const { error } = await supabase
            .from('meeting_participants')
            .delete()
            .eq('meeting_id', meetingId)
            .eq('user_id', user.id);

        if (error) throw error;
        
        showNotify('Opuściłeś spotkanie.', 'success');
        fetchPublicMeetings();
        fetchMyMeetings();

    } catch (err) {
        console.error(err);
        showNotify('Błąd podczas opuszczania spotkania.', 'error');
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

  const renderParticipants = (participants) => {
    if (!participants || participants.length === 0) return null;
    return (
      <div className="d-flex flex-wrap gap-1 mt-2">
        {participants.map((mp, idx) => {
           const p = mp.profiles || mp; 
           if (!p) return null;

           return (
             <img 
               key={idx}
               src={p.avatar_url || '/avatar.jpg'} 
               title={`${p.first_name} ${p.last_name}`}
               alt="uczestnik"
               className="rounded-circle border"
               width="24"
               height="24"
               style={{cursor: 'pointer'}}
               onClick={() => setViewProfileId(p.id)} 
             />
           );
        })}
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: 90 }}>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={() => setNotification({ message: '', type: '' })} 
      />
      <ConfirmModal 
        show={confirmModal.show} 
        title="Opuszczanie spotkania" 
        message="Czy na pewno chcesz zrezygnować z udziału w tym spotkaniu?" 
        onCancel={() => setConfirmModal({ show: false, meetingId: null })} 
        onConfirm={executeLeaveMeeting} 
      />

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
            
            <div className="small text-muted mt-2 d-flex align-items-center flex-wrap gap-3">
              <span className="me-2">Legenda:</span>
              
              <span className="d-flex align-items-center">
                <img 
                  src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" 
                  alt="" 
                  style={{ height: '18px', marginRight: '5px' }} 
                />
                <span style={{color: 'blue', fontWeight: 'bold'}}>Bar</span>
              </span>

              <span className="d-flex align-items-center">
                <img 
                  src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" 
                  alt="" 
                  style={{ 
                    height: '18px', 
                    marginRight: '5px',
                    filter: 'hue-rotate(150deg) brightness(0.65) saturate(2)' 
                  }} 
                />
                <span style={{color: '#8B4513', fontWeight: 'bold'}}>Pub</span>
              </span>

              <span className="d-flex align-items-center">
                <img 
                  src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" 
                  alt="" 
                  style={{ height: '18px', marginRight: '5px' }} 
                />
                <span style={{color: 'green', fontWeight: 'bold'}}>Klub nocny</span>
              </span>

              <span className="d-flex align-items-center">
                <img 
                  src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png" 
                  alt="" 
                  style={{ height: '18px', marginRight: '5px' }} 
                />
                <span style={{color: '#d4af37', fontWeight: 'bold'}}>Spotkanie</span>
              </span>
            </div>
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
              showNotify('Spotkanie utworzone!', 'success');
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
                  <li key={m.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{m.title}</strong>
                        <div className="small text-muted">
                          📅 {new Date(m.meeting_time).toLocaleString()}
                        </div>
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => confirmLeaveMeeting(m.id)}
                      >
                        Opuść
                      </button>
                    </div>
                    {m.meeting_participants && (
                        <div className="mt-2">
                            <small className="text-muted" style={{fontSize: '0.75rem'}}>Uczestnicy:</small>
                            {renderParticipants(m.meeting_participants)}
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Nie jesteś zapisany na żadne nadchodzące spotkania.</p>
            )}
          </section>

          <section id="past-meetings" className="mb-5">
            <h2 className="h5 mb-3 text-secondary">Historia spotkań (zakończone)</h2>
            {user && myPastMeetings.length > 0 ? (
              <ul className="list-group">
                {myPastMeetings.map(m => (
                  <li key={m.id} className="list-group-item bg-light border-light text-muted">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{m.title}</strong>
                        <div className="small">
                          🏁 {new Date(m.meeting_time).toLocaleString()}
                        </div>
                      </div>
                      <span className="badge bg-secondary rounded-pill">Zakończone</span>
                    </div>
                    {m.meeting_participants && (
                        <div className="mt-2">
                            <small className="text-muted" style={{fontSize: '0.75rem'}}>Byłeś z:</small>
                            {renderParticipants(m.meeting_participants)}
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted small">Brak historii spotkań.</p>
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
    </div>
  );
}