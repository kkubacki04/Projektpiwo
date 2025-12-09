import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function Profil({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    relationship_status: 'singiel',
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
        .select('first_name, last_name, relationship_status')
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
        });
      }
    } catch (error) {
      console.error('Błąd pobierania profilu:', error.message);
    } finally {
      setLoading(false);
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
          <h2 className="card-title mb-4">Uzupełnij swój profil</h2>
          <p className="text-muted">Aby korzystać z aplikacji, musimy wiedzieć jak się do Ciebie zwracać.</p>
          
          {loading ? (
            <p>Ładowanie danych...</p>
          ) : (
            <form onSubmit={updateProfile}>
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
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz dane'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}