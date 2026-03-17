import { useState, useRef, useCallback, useEffect } from 'react';

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);
  const SIZE = 280;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ w: img.width, h: img.height });
      // Fit image to canvas initially
      const fit = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
      imgRef.current = img;
      draw(img, fit, { x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const draw = useCallback((img, s, off) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw image
    const w = img.width * s;
    const h = img.height * s;
    const x = SIZE / 2 - w / 2 + off.x;
    const y = SIZE / 2 - h / 2 + off.y;
    ctx.drawImage(img, x, y, w, h);

    // Dark overlay outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle border
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (imgRef.current) draw(imgRef.current, scale, offset);
  }, [scale, offset, draw]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragStart]);

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setScale(prev => Math.min(5, Math.max(0.3, prev - e.deltaY * 0.001)));
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Draw circular crop
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();

    const img = imgRef.current;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = SIZE / 2 - w / 2 + offset.x;
    const y = SIZE / 2 - h / 2 + offset.y;
    // Scale to 256x256
    const ratio = 256 / SIZE;
    ctx.drawImage(img, x * ratio, y * ratio, w * ratio, h * ratio);

    canvas.toBlob(blob => onCrop(blob), 'image/png', 0.95);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3000, backdropFilter: 'blur(8px)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        background: 'var(--bg-raised)', border: 'var(--border-bright)',
        borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-lg)',
      }}>
        <h3 style={{ color: 'var(--white)', fontSize: 15, fontWeight: 700, margin: 0 }}>Crop Profile Picture</h3>
        <p style={{ color: 'var(--gray-3)', fontSize: 12, margin: 0 }}>Drag to reposition · Scroll to zoom</p>

        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          style={{ borderRadius: '50%', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <span style={{ fontSize: 11, color: 'var(--gray-2)' }}>🔍</span>
          <input
            type="range" min="0.3" max="5" step="0.01"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--gray-2)' }}>🔎</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            background: 'var(--bg-float)', color: 'var(--gray-4)',
            border: 'var(--border-bright)', borderRadius: 8,
            padding: '8px 20px', fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleCrop} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 24px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>Apply</button>
        </div>
      </div>
    </div>
  );
}