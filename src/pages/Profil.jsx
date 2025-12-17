import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function Profil({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    relationship_status: 'singiel',
    description: '',
    avatar_url: ''
  });

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
        .select('first_name, last_name, relationship_status, description, avatar_url')
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
      alert(error.message);
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
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      
      alert('Profil zaktualizowany!');
      navigate('/'); 
      
    } catch (error) {
      alert('Błąd podczas zapisu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!user) return <div className="container pt-5">Musisz być zalogowany.</div>;

  return (
    <div className="container" style={{ paddingTop: 120 }}>
      <div className="card mx-auto" style={{ maxWidth: '600px' }}>
        <div className="card-body">
          <h2 className="card-title mb-4">Twój profil</h2>
          
          {loading ? (
            <p>Ładowanie danych...</p>
          ) : (
            <form onSubmit={updateProfile}>
              
              <div className="d-flex flex-column align-items-center mb-4">
                <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: 15 }}>
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

              <div className="mb-3">
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

              <div className="mb-3">
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

              <div className="mb-3">
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

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                  {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}