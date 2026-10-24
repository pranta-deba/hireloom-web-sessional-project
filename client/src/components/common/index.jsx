import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiX, FiChevronLeft, FiChevronRight, FiUploadCloud, FiImage, FiPlay, FiPause, FiVolume2 } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa6';
import { toast } from 'sonner';
import { uploadImage, errMsg } from '../../lib/api';
import { cn, initials, youtubeId } from '../../lib/utils';

/* ───────── Modal ───────── */
export function Modal({ open, onClose, title, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()} role="dialog" aria-modal="true">
      <div className="modal__box" style={{ '--w': `${width}px` }}>
        {title !== undefined && (
          <div className="modal__head">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <FiX />
            </button>
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={440}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={cn('btn btn--sm', danger ? 'btn--danger' : 'btn--brand')}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <span className="spinner" />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

/* ───────── Pagination ───────── */
export function Pagination({ page, pages, total, onChange, label = 'items' }) {
  if (!pages || pages <= 1) return total ? <div className="pagination"><span className="pagination__info">{total} {label}</span></div> : null;
  const nums = [];
  const push = (n) => nums.push(n);
  const window = 1;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - window && i <= page + window)) push(i);
    else if (nums.at(-1) !== '…') push('…');
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <FiChevronLeft />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`g${i}`} className="pagination__gap">
            …
          </span>
        ) : (
          <button key={n} className={n === page ? 'is-active' : ''} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}>
            {n}
          </button>
        )
      )}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <FiChevronRight />
      </button>
      {total !== undefined && (
        <span className="pagination__info">
          Page {page} of {pages} · {total} {label}
        </span>
      )}
    </nav>
  );
}

/* ───────── Star rating (display + interactive) ───────── */
export function StarRating({ value = 0, onRate, size = '1.25rem', showLabel, count, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const interactive = !!onRate && !disabled;
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  return (
    <div className={cn('stars', interactive && 'stars--interactive')} style={{ '--star': size }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) =>
        interactive ? (
          <button key={n} type="button" className={n <= Math.round(shown) ? 'is-on' : ''} onMouseEnter={() => setHover(n)} onClick={() => onRate(n)} aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}>
            <FaStar />
          </button>
        ) : (
          <span key={n} className={n <= Math.round(shown) ? 'is-on' : ''}>
            <FaStar />
          </span>
        )
      )}
      {showLabel && (
        <span className="stars__label">
          {hover ? labels[hover] : `${Number(value || 0).toFixed(1)}${count !== undefined ? ` · ${count} rating${count === 1 ? '' : 's'}` : ''}`}
        </span>
      )}
    </div>
  );
}

/* ───────── Avatar ───────── */
export function Avatar({ src, name, size = '', className }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span className={cn('avatar', size && `avatar--${size}`, className)}>{initials(name || '?')}</span>;
  return <img className={cn('avatar', size && `avatar--${size}`, className)} src={src} alt={name || ''} onError={() => setBroken(true)} loading="lazy" />;
}

/* ───────── Empty state ───────── */
export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/* ───────── Markdown ───────── */
export function Markdown({ children, compact }) {
  return (
    <div className={cn('prose', compact && 'prose--compact')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}

/* ───────── Image uploader (imgbb via API) ───────── */
export function ImageUploader({ value, onChange, label = 'Upload image', aspect = '16/9', round, disabled, onBlocked }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handle = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    if (file.size > 8 * 1024 * 1024) return toast.error('Images must be under 8 MB.');
    setBusy(true);
    setProgress(0);
    try {
      const res = await uploadImage(file, setProgress);
      onChange(res.url);
      toast.success(res.provider === 'imgbb' ? 'Uploaded to imgbb' : 'Image uploaded');
    } catch (e) {
      toast.error(errMsg(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  const open = () => {
    if (disabled) return onBlocked?.();
    input.current?.click();
  };

  return (
    <div
      className={cn('uploader', round && 'uploader--round', drag && 'is-drag', value && 'has-image')}
      style={{ aspectRatio: round ? '1/1' : aspect }}
      onClick={open}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return onBlocked?.();
        handle(e.dataTransfer.files?.[0]);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      {value && <img src={value} alt="" />}
      <div className="uploader__overlay">
        {busy ? (
          <>
            <span className="spinner" />
            <small>{progress}%</small>
          </>
        ) : (
          <>
            {value ? <FiImage /> : <FiUploadCloud />}
            <small>{value ? 'Replace' : label}</small>
          </>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}

/* ───────── YouTube (external media) ───────── */
export function YouTubeEmbed({ url, title = 'Video' }) {
  const id = youtubeId(url);
  const [play, setPlay] = useState(false);
  if (!id) return null;
  return (
    <div className="yt">
      {play ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      ) : (
        <button className="yt__poster" onClick={() => setPlay(true)} aria-label={`Play ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="yt__play">
            <FiPlay />
          </span>
          <span className="yt__title">{title}</span>
        </button>
      )}
    </div>
  );
}

/* ───────── Audio player (external source) ───────── */
export function AudioPlayer({ src, title, artist }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState({ cur: 0, dur: 0 });
  const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
  return (
    <div className={cn('audio', playing && 'is-playing')}>
      <button
        className="audio__btn"
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused) {
            document.querySelectorAll('audio').forEach((x) => x !== a && x.pause());
            a.play().catch(() => toast.error('Could not play this audio source.'));
          } else a.pause();
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <FiPause /> : <FiPlay />}
      </button>
      <div className="audio__meta">
        <strong>{title}</strong>
        <small>
          <FiVolume2 /> {artist} · {fmt(t.cur)} / {fmt(t.dur)}
        </small>
        <input
          type="range"
          min={0}
          max={t.dur || 0}
          step="0.1"
          value={t.cur}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
          }}
          aria-label="Seek"
        />
      </div>
      <div className="audio__bars" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setT({ cur: e.target.currentTime, dur: e.target.duration })}
        onLoadedMetadata={(e) => setT({ cur: 0, dur: e.target.duration })}
      />
    </div>
  );
}

export { default as PageLoader } from './PageLoader';
