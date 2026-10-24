import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import { FiMapPin, FiMail, FiPhone, FiNavigation, FiSend, FiCrosshair } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { CONTACT_TOPICS } from '../lib/constants';

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function Contact() {
  const { config } = useConfig();
  const { user } = useAuth();
  const s = config.site;
  const office = { lat: Number(s.mapLat) || 23.7925, lng: Number(s.mapLng) || 90.4078 };
  const [mode, setMode] = useState('office');
  const [me, setMe] = useState(null);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef(null);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', topic: CONTACT_TOPICS[0], subject: '', preferredDate: null, message: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => () => watchId.current != null && navigator.geolocation.clearWatch(watchId.current), []);

  const track = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by this browser.');
    if (tracking) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setTracking(false);
      return;
    }
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy), at: new Date() });
        setMode('me');
      },
      (err) => {
        toast.error(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.');
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const mapSrc =
    mode === 'route' && me
      ? `https://maps.google.com/maps?saddr=${me.lat},${me.lng}&daddr=${office.lat},${office.lng}&output=embed`
      : mode === 'me' && me
        ? `https://maps.google.com/maps?q=${me.lat},${me.lng}&z=16&output=embed`
        : `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || `${office.lat},${office.lng}`)}&z=15&output=embed`;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent', { description: 'We usually reply within one business day.' });
      setForm((f) => ({ ...f, subject: '', message: '', preferredDate: null }));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="page-head container">
        <span className="eyebrow">Contact</span>
        <h1 className="display">
          Let’s talk about <em>your next move.</em>
        </h1>
        <p>Questions, partnerships, or a demo for your team — send a note or drop by the studio.</p>
      </section>

      <section className="container contact">
        <form className="card contact__form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input className="input" required value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" required value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label>Topic</label>
              <select className="select" value={form.topic} onChange={set('topic')}>
                {CONTACT_TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Preferred call date</label>
              <DatePicker selected={form.preferredDate} onChange={(d) => setForm((f) => ({ ...f, preferredDate: d }))} minDate={new Date()} filterDate={(d) => d.getDay() !== 5} showTimeSelect timeIntervals={30} dateFormat="d MMM yyyy, h:mm aa" placeholderText="Optional" isClearable />
            </div>
            <div className="field span-2">
              <label>Subject</label>
              <input className="input" value={form.subject} onChange={set('subject')} />
            </div>
            <div className="field span-2">
              <label>Message</label>
              <textarea className="textarea" rows={6} required value={form.message} onChange={set('message')} />
            </div>
          </div>
          <button className="btn btn--brand btn--lg" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? <span className="spinner" /> : <FiSend />} Send message
          </button>
        </form>

        <div className="stack">
          <div className="map card">
            <div className="map__bar">
              <div className="tabs">
                <button className={mode === 'office' ? 'is-active' : ''} onClick={() => setMode('office')}>
                  <FiMapPin /> Office
                </button>
                <button className={mode === 'me' ? 'is-active' : ''} onClick={() => (me ? setMode('me') : track())}>
                  <FiCrosshair /> Me
                </button>
                <button className={mode === 'route' ? 'is-active' : ''} onClick={() => (me ? setMode('route') : toast('Enable live location first'))}>
                  <FiNavigation /> Route
                </button>
              </div>
              <button className={`btn btn--sm ${tracking ? 'btn--brand' : 'btn--ghost'}`} onClick={track}>
                {tracking ? <span className="live-dot" /> : <FiCrosshair />} {tracking ? 'Live' : 'Live location'}
              </button>
            </div>
            <iframe key={mapSrc} title="Map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            {me && (
              <div className="map__info mono">
                {me.lat.toFixed(5)}, {me.lng.toFixed(5)} · ±{me.acc} m · {haversineKm(me, office).toFixed(1)} km from office · updated {me.at.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="contact__cards">
            <a href={`mailto:${s.contactEmail}`} className="card card--hover">
              <FiMail />
              <small>Email</small>
              <strong>{s.contactEmail}</strong>
            </a>
            <a href={`tel:${(s.phone || '').replace(/\s/g, '')}`} className="card card--hover">
              <FiPhone />
              <small>Phone</small>
              <strong>{s.phone}</strong>
            </a>
            <div className="card">
              <FiMapPin />
              <small>Studio</small>
              <strong>{s.address}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
