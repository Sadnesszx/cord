import './WarningModal.css';

export default function WarningModal({ message, onClose }) {
  return (
    <div className="warning-overlay">
      <div className="warning-modal">
        <div className="warning-icon">⚠️</div>
        <h3>Warning from Admin</h3>
        <p>{message}</p>
        <button className="btn-primary" onClick={onClose}>I understand</button>
      </div>
    </div>
  );
}