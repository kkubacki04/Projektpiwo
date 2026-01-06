import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification'; 
import '../index.css';

const INTERESTS_LIST = [
  "🎥 Filmy", "🎬 Seriale", "🎮 Gry wideo", "🎲 Gry planszowe", "📚 Książki",
  "🎵 Muzyka", "🎸 Gra na instrumencie", "🎧 Koncerty", "🎨 Sztuka", "📸 Fotografia",
  "💃 Taniec", "🎤 Śpiewanie", "🎭 Teatr", "✈️ Podróże", "⛺ Camping",
  "🌲 Natura", "🏔️ Góry", "🌊 Morze", "🚴 Rower", "🏃 Bieganie",
  "⚽ Piłka nożna", "🏀 Koszykówka", "🏐 Siatkówka", "🎾 Tenis", "💪 Siłownia",
  "🧘 Joga", "🥋 Sztuki walki", "🏎️ Motoryzacja", "💻 Programowanie", "📱 Nowe technologie",
  "🚀 Kosmos", "🧪 Nauka", "🏛️ Historia", "🧠 Psychologia", "🍳 Gotowanie",
  "🍕 Pizza", "🍔 Fast Food", "🥗 Zdrowe jedzenie", "☕ Kawa", "🍺 Piwo kraftowe",
  "🍷 Wino", "🍹 Drinki", "🐕 Psy", "🐈 Koty", "🐾 Zwierzęta",
  "👗 Moda", "🛍️ Zakupy", "💄 Makijaż", "💅 Beauty", "🛠️ Majsterkowanie"
];

export default function Profil({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    relationship_status: 'singiel',
    description: '',
    avatar_url: ''
  });
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, relationship_status, description, avatar_url, interests')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          relationship_status: data.relationship_status || 'singiel',
          description: data.description || '',
          avatar_url: data.avatar_url || ''
        });
        setSelectedInterests(data.interests || []);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Wybierz zdjęcie.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      if (formData.avatar_url) {
        const oldUrl = formData.avatar_url;
        const parts = oldUrl.split('/avatars/');
        if (parts.length === 2) {
          const oldPath = decodeURIComponent(parts[1]);
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));

    } catch (error) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updates = {
        id: user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        relationship_status: formData.relationship_status,
        description: formData.description,
        avatar_url: formData.avatar_url,
        interests: selectedInterests,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      
      setNotification({ message: 'Profil zaktualizowany pomyślnie!', type: 'success' });
      
    } catch (error) {
      setNotification({ message: 'Błąd zapisu: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  if (!user) return <div className="container pt-5">Musisz być zalogowany.</div>;

  return (
    <div className="container" style={{ paddingTop: 120, paddingBottom: 60 }}>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={() => setNotification({ message: '', type: '' })} 
      />

      <div className="card mx-auto shadow-sm" style={{ maxWidth: '800px' }}>
        <div className="card-body">
          <h2 className="card-title mb-4 text-center">Twój profil</h2>
          
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <form onSubmit={updateProfile}>

              <div className="d-flex flex-column align-items-center mb-4">
                <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: 15, border: '1px solid #ddd' }}>
                  {formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                      Brak
                    </div>
                  )}
                </div>
                
                <label className="btn btn-sm btn-outline-primary">
                  {uploading ? 'Wysyłanie...' : 'Zmień zdjęcie'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Imię</label>
                    <input
                      type="text"
                      className="form-control"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nazwisko</label>
                    <input
                      type="text"
                      className="form-control"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Status związku</label>
                <select
                  className="form-select"
                  name="relationship_status"
                  value={formData.relationship_status}
                  onChange={handleChange}
                >
                  <option value="singiel">Singiel / Singielka</option>
                  <option value="w_zwiazku">W związku</option>
                  <option value="to_skomplikowane">To skomplikowane</option>
                  <option value="szukam_wrazen">Szukam wrażeń</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label">Opis (Bio)</label>
                <textarea
                  className="form-control"
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Napisz coś o sobie..."
                />
              </div>

              <hr className="my-4" />

              <h5 className="mb-3 text-primary">Twoje zainteresowania</h5>
              <p className="text-muted small">Zaznacz to co lubisz, aby inni mogli Cię lepiej poznać.</p>
              
              <div className="d-flex flex-wrap gap-2 mb-5">
                  {INTERESTS_LIST.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                          <span 
                              key={interest} 
                              onClick={() => toggleInterest(interest)}
                              className={`badge rounded-pill user-select-none border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-light text-dark border-secondary-subtle'}`}
                              style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '0.9rem', transition: 'all 0.2s' }}
                          >
                              {interest} {isSelected && '✓'}
                          </span>
                      )
                  })}
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving || uploading}>
                  {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/')}>
                    Wróć do mapy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}