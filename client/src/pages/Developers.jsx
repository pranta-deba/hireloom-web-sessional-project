import { useState } from 'react';
import axios from 'axios';
import { FiPlay, FiCode, FiDatabase, FiServer } from 'react-icons/fi';
import { toast } from 'sonner';

const GQL_SAMPLE = `query Landing {
  siteStats { users blogs resumes templates }
  trending(limit: 3) {
    title slug readTime
    author { name username }
  }
  viewer { username role }
}`;

const SOAP_ATS = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://hireloom.dev/soap">
  <soap:Body>
    <tns:GetAtsScoreRequest>
      <tns:resumeText>Senior React engineer. Led rebuild in React and TypeScript, cut bundle size by 41%. Built design system. Mentored 6 engineers. Skills: React, TypeScript, GraphQL, Node.js. Education: B.Sc. CSE. Email me@mail.com</tns:resumeText>
      <tns:jobDescription>We need a React developer with TypeScript, GraphQL, Docker and AWS.</tns:jobDescription>
    </tns:GetAtsScoreRequest>
  </soap:Body>
</soap:Envelope>`;

const SOAP_STATS = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://hireloom.dev/soap">
  <soap:Body><tns:GetSiteStatsRequest/></soap:Body>
</soap:Envelope>`;

const REST = [
  ['GET', '/api/blogs?page=1&limit=3', 'Approved posts, paginated'],
  ['GET', '/api/templates?category=cv', 'Résumé / CV templates'],
  ['GET', '/api/ratings/site', 'Site rating summary & reviews'],
  ['GET', '/api/auth/check-username?username=admin', 'Real-time username availability'],
  ['GET', '/api/config/public', 'Public runtime configuration'],
];

function Output({ value, lang }) {
  if (value == null) return <div className="dev__out dev__out--empty">Run a request to see the response.</div>;
  return (
    <pre className="dev__out">
      <code>{lang === 'json' ? JSON.stringify(value, null, 2) : value}</code>
    </pre>
  );
}

export default function Developers() {
  const [tab, setTab] = useState('rest');
  const [rest, setRest] = useState(REST[0][1]);
  const [gql, setGql] = useState(GQL_SAMPLE);
  const [soap, setSoap] = useState(SOAP_ATS);
  const [soapAction, setSoapAction] = useState('GetAtsScore');
  const [out, setOut] = useState(null);
  const [meta, setMeta] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const t0 = performance.now();
    try {
      let res;
      if (tab === 'rest') res = await axios.get(rest, { withCredentials: true });
      if (tab === 'graphql') res = await axios.post('/graphql', { query: gql }, { withCredentials: true });
      if (tab === 'soap') res = await axios.post('/soap/hireloom', soap, { headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `http://hireloom.dev/soap/${soapAction}` }, responseType: 'text', transformResponse: (r) => r });
      setOut(tab === 'soap' ? prettyXml(res.data) : res.data);
      setMeta(`${res.status} ${res.statusText || 'OK'} · ${Math.round(performance.now() - t0)} ms`);
    } catch (e) {
      setOut(e.response?.data || e.message);
      setMeta(`${e.response?.status || 'ERR'} · ${Math.round(performance.now() - t0)} ms`);
      toast.error('Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="page-head container">
        <span className="eyebrow">Developers</span>
        <h1 className="display">
          Three API styles. <em>One platform.</em>
        </h1>
        <p>HireLoom exposes RESTful JSON endpoints, a GraphQL endpoint and a SOAP 1.1 web service with a WSDL — try them live below.</p>
        <div className="page-head__actions">
          <a href="/soap/hireloom?wsdl" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            View WSDL
          </a>
        </div>
      </section>

      <section className="container dev">
        <div className="tabs" style={{ marginBottom: 18 }}>
          <button className={tab === 'rest' ? 'is-active' : ''} onClick={() => { setTab('rest'); setOut(null); }}>
            <FiServer /> REST
          </button>
          <button className={tab === 'graphql' ? 'is-active' : ''} onClick={() => { setTab('graphql'); setOut(null); }}>
            <FiDatabase /> GraphQL
          </button>
          <button className={tab === 'soap' ? 'is-active' : ''} onClick={() => { setTab('soap'); setOut(null); }}>
            <FiCode /> SOAP
          </button>
        </div>

        <div className="dev__grid">
          <div className="card stack">
            {tab === 'rest' && (
              <>
                <div className="field">
                  <label>Endpoint</label>
                  <select className="select" value={rest} onChange={(e) => setRest(e.target.value)}>
                    {REST.map(([m, p, d]) => (
                      <option key={p} value={p}>
                        {m} {p} — {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Or type any GET path</label>
                  <input className="input mono" value={rest} onChange={(e) => setRest(e.target.value)} />
                </div>
              </>
            )}
            {tab === 'graphql' && (
              <div className="field">
                <label>
                  Query <span className="mono muted">POST /graphql</span>
                </label>
                <textarea className="textarea mono dev__code" rows={14} value={gql} onChange={(e) => setGql(e.target.value)} spellCheck={false} />
              </div>
            )}
            {tab === 'soap' && (
              <>
                <div className="field">
                  <label>Operation</label>
                  <select
                    className="select"
                    value={soapAction}
                    onChange={(e) => {
                      setSoapAction(e.target.value);
                      setSoap(e.target.value === 'GetAtsScore' ? SOAP_ATS : SOAP_STATS);
                    }}
                  >
                    <option>GetAtsScore</option>
                    <option>GetSiteStats</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    Envelope <span className="mono muted">POST /soap/hireloom</span>
                  </label>
                  <textarea className="textarea mono dev__code" rows={14} value={soap} onChange={(e) => setSoap(e.target.value)} spellCheck={false} />
                </div>
              </>
            )}
            <button className="btn btn--brand" onClick={run} disabled={busy}>
              {busy ? <span className="spinner" /> : <FiPlay />} Send request
            </button>
          </div>
          <div className="card stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Response</strong>
              {meta && <span className="badge badge--mint mono">{meta}</span>}
            </div>
            <Output value={out} lang={tab === 'soap' ? 'xml' : 'json'} />
          </div>
        </div>
      </section>
    </div>
  );
}

function prettyXml(xml = '') {
  let pad = 0;
  return xml
    .replace(/>\s*</g, '><')
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .map((line) => {
      if (/^<\/\w/.test(line)) pad = Math.max(0, pad - 1);
      const out = '  '.repeat(pad) + line;
      if (/^<\w[^>]*[^/]>.*$/.test(line) && !/<\/\w/.test(line) && !line.startsWith('<?')) pad++;
      return out;
    })
    .join('\n');
}
