import React, { useEffect } from 'react';

export default function Notification({ message, type, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000); 
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div 
      className={`alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} 
      role="alert"
      style={{
        position: 'fixed',
        top: '90px', 
        right: '20px',
        zIndex: 10000,
        minWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderLeft: `5px solid ${type === 'error' ? '#dc3545' : '#198754'}`
      }}
    >
      <strong>{type === 'error' ? 'Błąd!' : 'Sukces!'}</strong> {message}
      <button type="button" className="btn-close" onClick={onClose}></button>
    </div>
  );
}