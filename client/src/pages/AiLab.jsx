import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FiCamera, FiImage, FiCpu, FiPause, FiPlay, FiShield, FiZap, FiAlertTriangle } from 'react-icons/fi';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { createClassifier } from '../lib/tflite';
import { cn } from '../lib/utils';

const STAGES = ['Loading TFLite runtime (WASM)', 'Downloading model', 'Ready'];

export default function AiLab() {
  const { config } = useConfig();
  const { requireAuth } = useAuth();
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [running, setRunning] = useState(false);
  const [preds, setPreds] = useState([]);
  const [ms, setMs] = useState(0);
  const [fps, setFps] = useState(0);
  const clf = useRef(null);
  const video = useRef(null);
  const img = useRef(null);
  const stream = useRef(null);
  const raf = useRef(0);

  const ensureModel = async () => {
    if (clf.current) return clf.current;
    setError('');
    setStage(0);
    try {
      const ml = config.ml || {};
      // createClassifier loads runtime then model; reflect progress
      const t = setTimeout(() => setStage(1), 900);
      clf.current = await createClassifier({ modelUrl: ml.tfliteModelUrl, labelsUrl: ml.labelsUrl, wasmPath: ml.wasmPath });
      clearTimeout(t);
      setStage(2);
      return clf.current;
    } catch (e) {
      setStage(-1);
      setError(e.message || 'Could not load the model.');
      throw e;
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setRunning(false);
  };

  useEffect(() => () => stopCamera(), []);

  const loop = () => {
    let last = 0;
    let frames = 0;
    let fpsT = performance.now();
    const tick = (now) => {
      raf.current = requestAnimationFrame(tick);
      if (now - last < 120 || !video.current || video.current.readyState < 2) return;
      last = now;
      const r = clf.current.classify(video.current);
      setPreds(r.ranked);
      setMs(r.ms);
      frames++;
      if (now - fpsT > 1000) {
        setFps(frames);
        frames = 0;
        fpsT = now;
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const startCamera = requireAuth(async () => {
    try {
      await ensureModel();
      setSource('camera');
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 }, audio: false });
      stream.current = s;
      video.current.srcObject = s;
      await video.current.play();
      setRunning(true);
      loop();
    } catch (e) {
      if (e?.name === 'NotAllowedError') toast.error('Camera permission was denied.');
      else if (!error) toast.error(e.message || 'Could not start the camera.');
    }
  }, 'Sign in to use the AI Vision Lab');

  const onFile = requireAuth(async (file) => {
    if (!file) return;
    stopCamera();
    try {
      await ensureModel();
      setSource('image');
      const url = URL.createObjectURL(file);
      img.current.onload = () => {
        const r = clf.current.classify(img.current, 5);
        setPreds(r.ranked);
        setMs(r.ms);
        setFps(0);
        URL.revokeObjectURL(url);
      };
      img.current.src = url;
    } catch {
      /* error shown */
    }
  }, 'Sign in to use the AI Vision Lab');

  return (
    <div>
      <section className="page-head container">
        <span className="eyebrow">AI Vision Lab · TensorFlow Lite</span>
        <h1 className="display">
          Real-time predictions, <em>right in your browser.</em>
        </h1>
        <p>A TensorFlow Lite image-classification model runs on-device via WebAssembly. Frames never leave your computer — useful for checking that a profile photo is clear and on-topic, or just for fun.</p>
      </section>

      <section className="container lab">
        <div className="lab__stage card">
          <div className="lab__screen">
            <video ref={video} playsInline muted className={cn(source === 'camera' && 'is-on')} />
            <img ref={img} alt="" className={cn(source === 'image' && 'is-on')} />
            {!source && (
              <div className="lab__idle">
                <FiCpu />
                <p>Start your camera or drop an image to see live predictions.</p>
              </div>
            )}
            {running && (
              <div className="lab__hud mono">
                <span className="live-dot" /> LIVE · {fps} fps · {ms} ms
              </div>
            )}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            {running ? (
              <button className="btn btn--ghost" onClick={stopCamera}>
                <FiPause /> Stop camera
              </button>
            ) : (
              <button className="btn btn--brand" onClick={startCamera} disabled={stage === 0 || stage === 1}>
                <FiCamera /> Start camera
              </button>
            )}
            <label className="btn btn--soft">
              <FiImage /> Classify an image
              <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h4 style={{ marginBottom: 14 }}>Model status</h4>
            <ol className="lab__stages">
              {STAGES.map((s, i) => (
                <li key={s} className={cn(stage > i && 'is-done', stage === i && 'is-active')}>
                  <span>{stage > i || stage === 2 ? '✓' : stage === i ? <span className="spinner" style={{ width: 12, height: 12 }} /> : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            {error && (
              <div className="notice notice--danger" style={{ marginTop: 14 }}>
                <FiAlertTriangle />
                <div>
                  <strong>Model failed to load</strong>
                  <p>{error}. An admin can change the model URL in Settings → AI / ML.</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <h4>Top predictions</h4>
              {ms > 0 && <span className="badge badge--mint">{ms} ms inference</span>}
            </div>
            {preds.length ? (
              <div className="preds">
                {preds.map((p, i) => (
                  <div key={p.label + i} className={cn('preds__row', i === 0 && 'is-top')}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>{p.label}</strong>
                      <span className="mono">{(p.p * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${Math.max(2, p.p * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Predictions update several times per second while the camera is running.</p>
            )}
          </div>

          <div className="card card--flat lab__facts">
            <div>
              <FiShield /> <span>100% on-device — no frames uploaded</span>
            </div>
            <div>
              <FiZap /> <span>WASM-accelerated TFLite runtime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
