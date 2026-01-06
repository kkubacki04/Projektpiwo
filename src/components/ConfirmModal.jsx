import React from 'react';

export default function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10050}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Anuluj</button>
            <button type="button" className="btn btn-danger" onClick={onConfirm}>Potwierdź</button>
          </div>
        </div>
      </div>
    </div>
  );
}