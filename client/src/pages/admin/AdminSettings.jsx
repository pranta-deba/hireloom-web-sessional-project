import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiSave, FiGlobe, FiToggleRight, FiCpu, FiMessageCircle, FiMail, FiImage, FiFilm, FiSend, FiZap, FiPlus, FiTrash2, FiExternalLink, FiCopy, FiEye, FiEyeOff, FiInfo, FiAperture } from 'react-icons/fi';
import { FaGithub, FaGoogle } from 'react-icons/fa6';
import { api, errMsg } from '../../lib/api';
import { useConfig } from '../../context/ConfigContext';
import { PageLoader } from '../../components/common';

const TABS = [
  ['general', 'General', <FiGlobe key="g" />],
  ['features', 'Features', <FiToggleRight key="f" />],
  ['firebase', 'Firebase', <FaGoogle key="fb" />],
  ['github', 'GitHub', <FaGithub key="gh" />],
  ['ai', 'Gemini AI', <FiCpu key="ai" />],
  ['chatbot', 'Chatbot', <FiMessageCircle key="cb" />],
  ['email', 'Email (SMTP)', <FiMail key="em" />],
  ['imgbb', 'imgbb', <FiImage key="ib" />],
  ['media', 'Media', <FiFilm key="md" />],
  ['ml', 'TensorFlow Lite', <FiAperture key="ml" />],
];

/* ── small field helpers ── */
function Text({ label, value, onChange, placeholder, hint, type = 'text', mono, span }) {
  return (
    <div className={`field ${span ? 'span-2' : ''}`}>
      <label>{label}</label>
      <input className={`input ${mono ? 'mono' : ''}`} type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
function Secret({ label, value, onChange, hint, span }) {
  const [show, setShow] = useState(false);
  const masked = typeof value === 'string' && value.startsWith('••••');
  return (
    <div className={`field ${span ? 'span-2' : ''}`}>
      <label>
        {label} {masked && <span className="badge badge--mint">stored · encrypted</span>}
      </label>
      <div className="input-group">
        <input className="input mono" style={{ paddingLeft: 16, paddingRight: 52 }} type={show || masked ? 'text' : 'password'} value={value ?? ''} onFocus={(e) => masked && e.target.select()} onChange={(e) => onChange(e.target.value)} placeholder="Not set" autoComplete="off" />
        {!masked && (
          <span className="input-group__suffix">
            <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label="Toggle visibility">
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
          </span>
        )}
      </div>
      <span className="field__hint">{hint || 'Leave the masked value untouched to keep the stored key. Clear it to remove.'}</span>
    </div>
  );
}
function Toggle({ label, checked, onChange, hint }) {
  return (
    <div className="field span-2">
      <label className="switch">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" /> {label}
      </label>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
function Area({ label, value, onChange, rows = 4, hint, mono }) {
  return (
    <div className="field span-2">
      <label>{label}</label>
      <textarea className={`textarea ${mono ? 'mono' : ''}`} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
function Guide({ steps, link }) {
  return (
    <div className="guide">
      <FiInfo />
      <div>
        <ol>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {link && (
          <a href={link[1]} target="_blank" rel="noreferrer" className="link">
            {link[0]} <FiExternalLink />
          </a>
        )}
      </div>
    </div>
  );
}
function Copy({ text }) {
  return (
    <div className="copy-row">
      <code>{text}</code>
      <button
        type="button"
        className="icon-btn"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast.success('Copied');
        }}
        aria-label="Copy"
      >
        <FiCopy />
      </button>
    </div>
  );
}

export default function AdminSettings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'general';
  const { reload } = useConfig();
  const [s, setS] = useState(null);
  const [env, setEnv] = useState({});
  const [busy, setBusy] = useState('');
  const [testTo, setTestTo] = useState('');
  const [preview, setPreview] = useState('');
  const [aiModels, setAiModels] = useState(null);

  const loadModels = () =>
    api
      .get('/admin/settings/ai-models')
      .then(({ data }) => setAiModels(data))
      .catch(() => setAiModels({ configured: false, models: [], chain: [] }));

  useEffect(() => {
    if (tab === 'ai') loadModels();
  }, [tab]);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setS(data.settings);
      setEnv(data.env);
    });
  }, []);

  if (!s) return <PageLoader label="Loading settings" />;

  const up = (section, key) => (value) => setS((x) => ({ ...x, [section]: { ...x[section], [key]: value } }));
  const upSocial = (key) => (value) => setS((x) => ({ ...x, site: { ...x.site, social: { ...x.site.social, [key]: value } } }));

  const save = async (sections) => {
    setBusy('save');
    try {
      const payload = Object.fromEntries(sections.map((k) => [k, s[k]]));
      const { data } = await api.put('/admin/settings', payload);
      setS(data.settings);
      reload();
      toast.success('Settings saved', { description: 'Changes are live immediately — no restart needed.' });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const testMail = async (template) => {
    setBusy('mail');
    try {
      await save(['mail']);
      const { data } = await api.post('/admin/settings/test-mail', { to: testTo || undefined, template });
      toast.success(data.delivered ? `Email sent to ${data.to}` : 'SMTP verified, but the mail was not delivered.');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const testAi = async () => {
    setBusy('ai');
    try {
      await save(['ai']);
      const { data } = await api.post('/admin/settings/test-ai');
      toast.success(`Gemini (${data.model}) responded in ${data.ms} ms`, { description: data.sample.slice(0, 140) });
      loadModels();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const previewWelcome = async () => {
    const { data } = await api.post('/admin/settings/preview-welcome', { subject: s.mail.welcomeSubject, html: s.mail.welcomeHtml });
    setPreview(data.html);
  };

  const SaveBar = ({ sections, extra }) => (
    <div className="save-bar">
      {extra}
      <div className="spacer" />
      <button className="btn btn--brand" onClick={() => save(sections)} disabled={!!busy}>
        {busy === 'save' ? <span className="spinner" /> : <FiSave />} Save changes
      </button>
    </div>
  );

  const list = (section, key) => s[section][key] || [];
  const setList = (section, key, arr) => setS((x) => ({ ...x, [section]: { ...x[section], [key]: arr } }));

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1>Settings & integrations</h1>
        </div>
        <span className="badge badge--mint">Secrets are AES-256 encrypted at rest</span>
      </div>

      <div className="settings-shell">
        <nav className="settings-nav">
          {TABS.map(([k, label, icon]) => (
            <button key={k} className={tab === k ? 'is-active' : ''} onClick={() => setParams({ tab: k })}>
              {icon} {label}
            </button>
          ))}
        </nav>

        <div className="panel">
          <div className="panel__body">
            {tab === 'general' && (
              <>
                <div className="form-grid">
                  <Text label="Site name" value={s.site.name} onChange={up('site', 'name')} hint="Shown in navbar, footer, emails. Two capitalised words (e.g. HireLoom) get the split wordmark." />
                  <Text label="Tagline" value={s.site.tagline} onChange={up('site', 'tagline')} />
                  <Area label="Description" value={s.site.description} onChange={up('site', 'description')} rows={2} />
                  <Text label="Hero title" value={s.site.heroTitle} onChange={up('site', 'heroTitle')} span hint="The last two words are rendered in italic." />
                  <Area label="Hero subtitle" value={s.site.heroSubtitle} onChange={up('site', 'heroSubtitle')} rows={2} />
                  <Text label="Announcement bar" value={s.site.announcement} onChange={up('site', 'announcement')} span hint="Leave empty to hide." />
                  <Text label="Contact email" value={s.site.contactEmail} onChange={up('site', 'contactEmail')} hint="Contact-form submissions are forwarded here." />
                  <Text label="Phone" value={s.site.phone} onChange={up('site', 'phone')} />
                  <Text label="Address" value={s.site.address} onChange={up('site', 'address')} span />
                  <Text label="Google Maps search query" value={s.site.mapQuery} onChange={up('site', 'mapQuery')} span />
                  <Text label="Office latitude" type="number" value={s.site.mapLat} onChange={up('site', 'mapLat')} />
                  <Text label="Office longitude" type="number" value={s.site.mapLng} onChange={up('site', 'mapLng')} />
                  {['facebook', 'linkedin', 'github', 'x', 'youtube'].map((k) => (
                    <Text key={k} label={`${k[0].toUpperCase() + k.slice(1)} URL`} value={s.site.social?.[k]} onChange={upSocial(k)} />
                  ))}
                </div>
                <SaveBar sections={['site']} />
              </>
            )}

            {tab === 'features' && (
              <>
                <div className="form-grid">
                  <Toggle label="Allow new registrations" checked={s.site.allowRegistration} onChange={up('site', 'allowRegistration')} />
                  <Toggle label="Require email verification (OTP) on sign-up" checked={s.features.requireEmailVerification} onChange={up('features', 'requireEmailVerification')} />
                  <Toggle label="Require phone verification on sign-up" checked={s.features.requirePhoneVerification} onChange={up('features', 'requirePhoneVerification')} hint="Uses Firebase Phone Auth when enabled, otherwise demo SMS mode." />
                  <Toggle label="Auto-approve posts written by admins" checked={s.features.autoApproveAdminPosts} onChange={up('features', 'autoApproveAdminPosts')} />
                  <Text label="Blog posts per page" type="number" value={s.features.blogPostsPerPage} onChange={up('features', 'blogPostsPerPage')} />
                </div>
                <SaveBar sections={['site', 'features']} />
              </>
            )}

            {tab === 'firebase' && (
              <>
                <Guide
                  steps={[
                    'Firebase console → Add project → Add a Web app (</>) and copy its config values below.',
                    'Authentication → Sign-in method → enable Google and/or Phone (and GitHub if you want GitHub via Firebase).',
                    `Authentication → Settings → Authorised domains → add ${new URL(env.clientUrl || window.location.origin).hostname}.`,
                    'No service-account file is needed — the server verifies ID tokens with your Web API key.',
                  ]}
                  link={['Open Firebase console', 'https://console.firebase.google.com/']}
                />
                <div className="form-grid">
                  <Toggle label="Enable Firebase authentication" checked={s.firebase.enabled} onChange={up('firebase', 'enabled')} />
                  <Text label="API key" value={s.firebase.apiKey} onChange={up('firebase', 'apiKey')} mono />
                  <Text label="Auth domain" value={s.firebase.authDomain} onChange={up('firebase', 'authDomain')} mono placeholder="project.firebaseapp.com" />
                  <Text label="Project ID" value={s.firebase.projectId} onChange={up('firebase', 'projectId')} mono />
                  <Text label="Storage bucket" value={s.firebase.storageBucket} onChange={up('firebase', 'storageBucket')} mono />
                  <Text label="Messaging sender ID" value={s.firebase.messagingSenderId} onChange={up('firebase', 'messagingSenderId')} mono />
                  <Text label="App ID" value={s.firebase.appId} onChange={up('firebase', 'appId')} mono />
                  <Text label="Measurement ID" value={s.firebase.measurementId} onChange={up('firebase', 'measurementId')} mono />
                  <Toggle label="Google sign-in" checked={s.firebase.googleEnabled} onChange={up('firebase', 'googleEnabled')} />
                  <Toggle label="Phone (SMS) sign-in & verification" checked={s.firebase.phoneEnabled} onChange={up('firebase', 'phoneEnabled')} />
                  <Toggle label="Use Firebase for GitHub sign-in instead of the direct OAuth app" checked={s.firebase.githubViaFirebase} onChange={up('firebase', 'githubViaFirebase')} />
                </div>
                <SaveBar sections={['firebase']} />
              </>
            )}

            {tab === 'github' && (
              <>
                <Guide
                  steps={[
                    'GitHub → Settings → Developer settings → OAuth Apps → New OAuth App (or edit your existing app).',
                    'Homepage URL: your site URL. Authorization callback URL: paste the value below EXACTLY (same host — localhost ≠ 127.0.0.1 — same port 5173, no trailing slash).',
                    'Generate a client secret and paste both values here. In production, register a second OAuth app with your https domain.',
                  ]}
                  link={['Create a GitHub OAuth app', 'https://github.com/settings/applications/new']}
                />
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Authorization callback URL</label>
                  <Copy text={s.github.callbackUrl || env.githubCallbackDefault} />
                </div>
                <div className="form-grid">
                  <Toggle label="Enable GitHub sign-in" checked={s.github.enabled} onChange={up('github', 'enabled')} />
                  <Text label="Client ID" value={s.github.clientId} onChange={up('github', 'clientId')} mono />
                  <Secret label="Client secret" value={s.github.clientSecret} onChange={up('github', 'clientSecret')} />
                  <Text label="Callback URL override" value={s.github.callbackUrl} onChange={up('github', 'callbackUrl')} mono span hint={`Default: ${env.githubCallbackDefault}`} />
                  <Text label="Scopes" value={s.github.scope} onChange={up('github', 'scope')} mono />
                  <Toggle label="Send redirect_uri to GitHub (strict mode — leave OFF to always use the callback URL registered on your GitHub app)" checked={!!s.github.sendRedirectUri} onChange={up('github', 'sendRedirectUri')} />
                </div>
                <SaveBar sections={['github']} />
              </>
            )}

            {tab === 'ai' && (
              <>
                <Guide
                  steps={[
                    'Create a free key at aistudio.google.com/apikey and paste it below.',
                    'Pick a preferred model. If Google retires it or it is overloaded, HireLoom automatically falls back to the next available Gemini model — no downtime.',
                    'Click “Save & test connection”. Without a key the site runs in offline demo mode.',
                  ]}
                  link={['Get a Gemini API key', 'https://aistudio.google.com/apikey']}
                />
                <div className="form-grid">
                  <Secret label="Gemini API key" value={s.ai.geminiApiKey} onChange={up('ai', 'geminiApiKey')} span />
                  <div className="field">
                    <label>Preferred model</label>
                    <input className="input mono" list="gemini-models" value={s.ai.geminiModel ?? ''} placeholder="gemini-3.8-flash" onChange={(e) => up('ai', 'geminiModel')(e.target.value.trim())} />
                    <datalist id="gemini-models">
                      {(aiModels?.models || []).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <span className="field__hint">
                      {aiModels?.models?.length ? `${aiModels.models.length} text models available for this key.` : 'Save a valid key to load the model list.'}
                    </span>
                  </div>
                  <div className="field">
                    <label>Live fallback chain</label>
                    <div className="input mono" style={{ height: 'auto', minHeight: 44, whiteSpace: 'normal', lineHeight: 1.6 }}>
                      {aiModels?.chain?.length
                        ? aiModels.chain.slice(0, 5).map((m, i) => (
                            <span key={m}>
                              {i > 0 && ' → '}
                              {m}
                              {aiModels.lastGood === m && ' ✓'}
                              {aiModels.cooling?.includes(m) && ' (busy)'}
                            </span>
                          ))
                        : '—'}
                    </div>
                    <span className="field__hint">✓ = last model that answered · (busy) = temporarily skipped after a 503/timeout.</span>
                  </div>
                  <Text label="Temperature" type="number" value={s.ai.temperature} onChange={up('ai', 'temperature')} hint="0 = precise · 1 = creative" />
                  <Text label="Max tokens" type="number" value={s.ai.maxTokens} onChange={up('ai', 'maxTokens')} />
                  <Area label="Résumé writer system prompt" value={s.ai.resumeSystemPrompt} onChange={up('ai', 'resumeSystemPrompt')} rows={3} />
                  <Area label="Cover-letter system prompt" value={s.ai.coverLetterSystemPrompt} onChange={up('ai', 'coverLetterSystemPrompt')} rows={3} />
                  <Area label="ATS coach system prompt" value={s.ai.atsSystemPrompt} onChange={up('ai', 'atsSystemPrompt')} rows={3} />
                </div>
                <SaveBar
                  sections={['ai']}
                  extra={
                    <button className="btn btn--ghost" onClick={testAi} disabled={!!busy}>
                      {busy === 'ai' ? <span className="spinner" /> : <FiZap />} Save & test connection
                    </button>
                  }
                />
              </>
            )}

            {tab === 'chatbot' && (
              <>
                <div className="form-grid">
                  <Toggle label="Show the floating AI assistant" checked={s.chatbot.enabled} onChange={up('chatbot', 'enabled')} />
                  <Text label="Assistant name" value={s.chatbot.name} onChange={up('chatbot', 'name')} />
                  <Text label="History length (messages)" type="number" value={s.chatbot.historyLimit} onChange={up('chatbot', 'historyLimit')} />
                  <Area label="Greeting" value={s.chatbot.greeting} onChange={up('chatbot', 'greeting')} rows={2} />
                  <Area label="System prompt (personality & rules)" value={s.chatbot.systemPrompt} onChange={up('chatbot', 'systemPrompt')} rows={5} />
                  <div className="field span-2">
                    <label>Suggested questions</label>
                    <div className="stack" style={{ '--gap': '8px' }}>
                      {list('chatbot', 'suggestions').map((q, i) => (
                        <div key={i} className="social-row" style={{ gridTemplateColumns: '1fr auto' }}>
                          <input className="input" value={q} onChange={(e) => setList('chatbot', 'suggestions', list('chatbot', 'suggestions').map((x, j) => (j === i ? e.target.value : x)))} />
                          <button type="button" className="icon-btn icon-btn--danger" onClick={() => setList('chatbot', 'suggestions', list('chatbot', 'suggestions').filter((_, j) => j !== i))}>
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn--soft btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setList('chatbot', 'suggestions', [...list('chatbot', 'suggestions'), ''])}>
                        <FiPlus /> Add suggestion
                      </button>
                    </div>
                  </div>
                </div>
                <SaveBar sections={['chatbot']} />
              </>
            )}

            {tab === 'email' && (
              <>
                <Guide
                  steps={['Gmail: enable 2-Step Verification, then create an App Password (Google Account → Security → App passwords).', 'Host smtp.gmail.com · Port 465 · Secure on · User = your Gmail · Password = the 16-character app password.', 'Any SMTP provider works (Zoho, Outlook, SendGrid, Mailgun, Brevo, Hostinger…).']}
                  link={['Create a Gmail App Password', 'https://myaccount.google.com/apppasswords']}
                />
                <div className="form-grid">
                  <Toggle label="Enable outgoing email" checked={s.mail.enabled} onChange={up('mail', 'enabled')} hint="When off, OTP codes are shown on screen in development and welcome emails are skipped." />
                  <Text label="SMTP host" value={s.mail.host} onChange={up('mail', 'host')} mono placeholder="smtp.gmail.com" />
                  <Text label="Port" type="number" value={s.mail.port} onChange={up('mail', 'port')} />
                  <Toggle label="Use SSL/TLS (port 465)" checked={s.mail.secure} onChange={up('mail', 'secure')} />
                  <Text label="Username" value={s.mail.user} onChange={up('mail', 'user')} mono />
                  <Secret label="Password / app password" value={s.mail.pass} onChange={up('mail', 'pass')} />
                  <Text label="From name" value={s.mail.fromName} onChange={up('mail', 'fromName')} />
                  <Text label="From email" value={s.mail.fromEmail} onChange={up('mail', 'fromEmail')} mono />
                  <Toggle label="Send a welcome email to every new member" checked={s.mail.sendWelcome} onChange={up('mail', 'sendWelcome')} />
                  <Text label="Welcome subject" value={s.mail.welcomeSubject} onChange={up('mail', 'welcomeSubject')} span />
                  <Area label="Welcome email HTML" value={s.mail.welcomeHtml} onChange={up('mail', 'welcomeHtml')} rows={12} mono hint="Placeholders: {{name}} {{username}} {{siteName}} {{loginUrl}} {{year}}" />
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn btn--ghost btn--sm" onClick={previewWelcome}>
                    <FiEye /> Preview welcome email
                  </button>
                  <input className="input" style={{ maxWidth: 260, height: 36 }} placeholder="Test recipient (default: you)" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                  <button className="btn btn--ghost btn--sm" onClick={() => testMail()} disabled={!!busy}>
                    {busy === 'mail' ? <span className="spinner" /> : <FiSend />} Send SMTP test
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => testMail('welcome')} disabled={!!busy}>
                    <FiSend /> Send welcome test
                  </button>
                </div>
                {preview && <iframe className="mail-preview" title="Welcome email preview" srcDoc={preview} />}
                <SaveBar sections={['mail']} />
              </>
            )}

            {tab === 'imgbb' && (
              <>
                <Guide steps={['Sign in at imgbb.com → About → API, and generate a key.', 'All image uploads (avatars, blog covers, résumé photos, template thumbnails) go to imgbb. Without a key they are stored on the server’s /uploads folder.']} link={['Get an imgbb API key', 'https://api.imgbb.com/']} />
                <div className="form-grid">
                  <Secret label="imgbb API key" value={s.imgbb.apiKey} onChange={up('imgbb', 'apiKey')} span />
                  <Text label="Auto-delete after (seconds)" type="number" value={s.imgbb.expiration} onChange={up('imgbb', 'expiration')} hint="0 = keep forever (recommended)" />
                </div>
                <SaveBar sections={['imgbb']} />
              </>
            )}

            {tab === 'media' && (
              <>
                <h4 style={{ marginBottom: 12 }}>YouTube videos</h4>
                <div className="stack" style={{ '--gap': '8px' }}>
                  {list('media', 'videos').map((v, i) => (
                    <div key={i} className="media-row">
                      <input className="input" placeholder="Title" value={v.title} onChange={(e) => setList('media', 'videos', list('media', 'videos').map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                      <input className="input mono" placeholder="YouTube ID or URL" value={v.youtubeId} onChange={(e) => setList('media', 'videos', list('media', 'videos').map((x, j) => (j === i ? { ...x, youtubeId: (e.target.value.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || e.target.value } : x)))} />
                      <input className="input" placeholder="Channel" value={v.channel} onChange={(e) => setList('media', 'videos', list('media', 'videos').map((x, j) => (j === i ? { ...x, channel: e.target.value } : x)))} />
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => setList('media', 'videos', list('media', 'videos').filter((_, j) => j !== i))}>
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn--soft btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setList('media', 'videos', [...list('media', 'videos'), { title: '', youtubeId: '', channel: '' }])}>
                    <FiPlus /> Add video
                  </button>
                </div>
                <h4 style={{ margin: '26px 0 12px' }}>Audio streams</h4>
                <div className="stack" style={{ '--gap': '8px' }}>
                  {list('media', 'audios').map((a, i) => (
                    <div key={i} className="media-row">
                      <input className="input" placeholder="Title" value={a.title} onChange={(e) => setList('media', 'audios', list('media', 'audios').map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                      <input className="input mono" placeholder="https://…/file.mp3" value={a.url} onChange={(e) => setList('media', 'audios', list('media', 'audios').map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                      <input className="input" placeholder="Artist" value={a.artist} onChange={(e) => setList('media', 'audios', list('media', 'audios').map((x, j) => (j === i ? { ...x, artist: e.target.value } : x)))} />
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => setList('media', 'audios', list('media', 'audios').filter((_, j) => j !== i))}>
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn--soft btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setList('media', 'audios', [...list('media', 'audios'), { title: '', url: '', artist: '' }])}>
                    <FiPlus /> Add audio
                  </button>
                </div>
                <SaveBar sections={['media']} />
              </>
            )}

            {tab === 'ml' && (
              <>
                <Guide steps={['Any image-classification .tflite model hosted with CORS enabled works (e.g. MediaPipe / Kaggle models).', 'Labels file: one class name per line, in output order.', 'The model runs entirely in the visitor’s browser through the TFLite WebAssembly runtime.']} />
                <div className="form-grid">
                  <Text label="TFLite model URL" value={s.ml.tfliteModelUrl} onChange={up('ml', 'tfliteModelUrl')} mono span />
                  <Text label="Labels URL" value={s.ml.labelsUrl} onChange={up('ml', 'labelsUrl')} mono span />
                  <Text label="WASM runtime path" value={s.ml.wasmPath} onChange={up('ml', 'wasmPath')} mono span />
                </div>
                <SaveBar sections={['ml']} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
