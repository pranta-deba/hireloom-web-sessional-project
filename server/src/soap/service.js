import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import soap from 'soap';
import { analyzeResume } from '../services/atsService.js';
import { User, Blog, Resume, Template } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wsdl = fs.readFileSync(path.join(__dirname, 'hireloom.wsdl'), 'utf8');

/**
 * SOAP 1.1 endpoint — WSDL at  GET /soap/hireloom?wsdl
 * Operations: GetAtsScore, GetSiteStats
 */
const service = {
  HireLoomService: {
    HireLoomPort: {
      GetAtsScore(args, callback) {
        try {
          const result = analyzeResume(String(args.resumeText || ''), String(args.jobDescription || ''));
          callback(null, {
            score: result.score,
            grade: result.grade,
            matchedKeywords: result.matchedKeywords.join(', '),
            missingKeywords: result.missingKeywords.join(', '),
          });
        } catch (e) {
          callback({ Fault: { faultcode: 'soap:Server', faultstring: e.message } });
        }
      },
      GetSiteStats(_args, callback) {
        Promise.all([User.countDocuments(), Blog.countDocuments({ status: 'approved' }), Resume.countDocuments(), Template.countDocuments({ isActive: true })])
          .then(([users, blogs, resumes, templates]) => callback(null, { users, blogs, resumes, templates }))
          .catch((e) => callback({ Fault: { faultcode: 'soap:Server', faultstring: e.message } }));
      },
    },
  },
};

export function mountSoap(app) {
  const server = soap.listen(app, '/soap/hireloom', service, wsdl);
  server.log = (type, data) => {
    if (type === 'error') console.error('SOAP error:', data);
  };
  return server;
}
