export default function ImageLightbox({ url, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, cursor: 'zoom-out',
      }}
      onClick={onClose}
    >
      <img
        src={url}
        alt="fullscreen"
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: '#1a1a1a', border: '1px solid #333',
          color: '#e8e8e8', borderRadius: 8, padding: '6px 12px',
          cursor: 'pointer', fontSize: 16,
        }}
      >✕</button>
    </div>
  );
}