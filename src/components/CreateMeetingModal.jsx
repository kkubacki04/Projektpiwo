import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CreateMeetingModal({ show, onClose, lat, lng, venueName, user, onMeetingCreated }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [max, setMax] = useState(5);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && venueName) {
      setTitle(`Spotkanie w: ${venueName}`);
    } else if (show) {
      setTitle('');
    }
  }, [show, venueName]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('Musisz być zalogowany.');

    setLoading(true);
    try {
      const dateTime = new Date(`${date}T${time}`);
      
      const { error } = await supabase.from('meetings').insert({
        creator_id: user.id,
        title,
        description: desc,
        meeting_time: dateTime.toISOString(),
        lat,
        lng,
        max_participants: max,
        is_public: isPublic
      });

      if (error) throw error;

      alert('Spotkanie utworzone!');
      onMeetingCreated(); 
      onClose();
    } catch (err) {
      alert('Błąd: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Utwórz spotkanie</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Co robimy?</label>
                <input required className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Np. Piwo w plenerze" />
              </div>
              <div className="mb-3">
                <label className="form-label">Opis</label>
                <textarea className="form-control" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">Data</label>
                  <input required type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="col">
                  <label className="form-label">Godzina</label>
                  <input required type="time" className="form-control" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Max osób: {max}</label>
                <input type="range" className="form-range" min="2" max="20" value={max} onChange={e => setMax(e.target.value)} />
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} id="pubCheck" />
                <label className="form-check-label" htmlFor="pubCheck">Publiczne (widoczne dla wszystkich)</label>
              </div>
              <div className="d-grid">
                <button disabled={loading} className="btn btn-primary">{loading ? 'Tworzenie...' : 'Utwórz spotkanie'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}