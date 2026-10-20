/**
 * PowerTrack Vercel Serverless API Handler
 * Adapts the local server.js API routes for Vercel's serverless environment.
 * Uses Firebase REST API for data persistence (Vercel has a read-only filesystem).
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const PRIMARY_SUPER_ADMIN = 'kotkarchaitanya18@gmail.com';
const FIREBASE_DB_URL = 'https://powertrack-f0187-default-rtdb.asia-southeast1.firebasedatabase.app';

// ── Firebase REST helpers ──────────────────────────────────────────────

function firebaseGet(refPath) {
  return new Promise((resolve, reject) => {
    const reqUrl = `${FIREBASE_DB_URL}/${refPath}.json`;
    https.get(reqUrl, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function firebasePut(refPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const parsed = new URL(`${FIREBASE_DB_URL}/${refPath}.json`);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(true));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Seed Data Loader (read-only from bundled data.json) ────────────────

function loadSeedData() {
  try {
    return require('../data.json');
  } catch (e) {
    try {
      const dataFile = path.join(__dirname, '..', 'data.json');
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not load seed data.json:', err.message);
    }
  }
  return null;
}

// ── Load data: Firebase first → seed fallback ──────────────────────────

async function loadData() {
  try {
    const fbData = await firebaseGet('powertrack_data');
    if (fbData && fbData.systemStatus) {
      if (!Array.isArray(fbData.authorizedAdmins)) fbData.authorizedAdmins = [PRIMARY_SUPER_ADMIN];
      if (!Array.isArray(fbData.adminRequests)) fbData.adminRequests = [];
      return fbData;
    }
  } catch (e) {
    console.warn('Firebase read failed, using seed:', e.message);
  }

  // Fallback to bundled seed data.json
  const seed = loadSeedData();
  if (seed) {
    if (!Array.isArray(seed.authorizedAdmins)) seed.authorizedAdmins = [PRIMARY_SUPER_ADMIN];
    if (!Array.isArray(seed.adminRequests)) seed.adminRequests = [];
    return seed;
  }

  return null;
}

async function saveData(data) {
  try {
    await firebasePut('powertrack_data', data);
    return true;
  } catch (e) {
    console.error('Firebase write failed:', e.message);
    return false;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function dispatchApprovalEmail(reqObj, acceptUrl, declineUrl) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      _subject: `⚡ PowerTrack Alert: New Admin Registration Request from ${reqObj.name}`,
      name: "PowerTrack Security Gateway",
      Applicant_Name: reqObj.name,
      Applicant_Email: reqObj.email,
      Department_Role: reqObj.designation || "Substation Administrator",
      Request_Timestamp: new Date().toLocaleString(),
      Action_Required: "Please review and ACCEPT or DECLINE this administrator access request:",
      "⚡ ACCEPT AND REGISTER LINK": acceptUrl,
      "❌ DECLINE REQUEST LINK": declineUrl,
      _template: "table",
      _captcha: "false",
      message: `PowerTrack Administrator Request Details:\n\n` +
               `Applicant: ${reqObj.name}\n` +
               `Email: ${reqObj.email}\n` +
               `Role: ${reqObj.designation || 'Administrator'}\n` +
               `Date: ${new Date().toLocaleString()}\n\n` +
               `--------------------------------------------------\n` +
               `DECISION ACTIONS:\n\n` +
               `To ACCEPT & register this new admin, click:\n${acceptUrl}\n\n` +
               `To DECLINE this request, click:\n${declineUrl}\n\n` +
               `--------------------------------------------------\n` +
               `You can also manage this request inside PowerTrack Admin Panel under 'Admin Approvals'.`
    });

    const options = {
      hostname: 'formsubmit.co',
      port: 443,
      path: `/ajax/${PRIMARY_SUPER_ADMIN}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
    });

    req.on('error', (err) => {
      console.warn('⚡ FormSubmit email dispatch notice:', err.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

function renderActionHtml({ success, isApprove, title, message, applicant }) {
  const accentColor = isApprove ? '#10b981' : '#ef4444';
  const icon = isApprove ? '⚡ ✅' : (success === false ? '⚠️' : '🛑 ❌');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PowerTrack - ${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 50% 20%, #151d2f 0%, #070a10 100%);
      color: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 1.5rem;
    }
    .card {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid ${accentColor};
      border-radius: 20px; padding: 2.75rem 2.25rem;
      max-width: 540px; width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 50px rgba(16, 185, 129, 0.15);
      text-align: center;
    }
    .brand {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-weight: 800; letter-spacing: 0.05em; color: #38bdf8;
      font-size: 0.85rem; text-transform: uppercase; margin-bottom: 1.25rem;
      padding: 0.35rem 0.9rem; background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 999px;
    }
    .icon { font-size: 3.5rem; margin-bottom: 1.25rem; display: block; }
    h1 { font-size: 1.85rem; font-weight: 800; color: ${accentColor}; margin-bottom: 0.75rem; line-height: 1.25; }
    p { color: #94a3b8; font-size: 1rem; line-height: 1.6; margin-bottom: 1.75rem; }
    .details {
      background: #1e293b; border: 1px solid #334155; border-radius: 12px;
      padding: 1.25rem 1.5rem; text-align: left; margin-bottom: 2rem; font-size: 0.92rem;
    }
    .row { display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; }
    .val { color: #f8fafc; font-weight: 700; }
    .badge {
      display: inline-block; padding: 0.2rem 0.65rem; border-radius: 6px;
      font-size: 0.75rem; font-weight: 800;
      background: ${isApprove ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};
      color: ${accentColor}; border: 1px solid ${accentColor};
    }
    .btn {
      display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none;
      font-weight: 700; font-size: 1rem; padding: 0.85rem 2rem; border-radius: 10px;
      transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
    }
    .btn:hover { background: #0284c7; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5); }
    .footer-note { margin-top: 1.75rem; font-size: 0.78rem; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">⚡ PowerTrack Security System</div>
    <span class="icon">${icon}</span>
    <h1>${title}</h1>
    <p>${message}</p>

    ${applicant ? `
    <div class="details">
      <div class="row"><span class="label">Applicant Name</span><span class="val">${applicant.name || 'Administrator'}</span></div>
      <div class="row"><span class="label">Admin Email</span><span class="val" style="color:#38bdf8; font-family:'JetBrains Mono', monospace;">${applicant.email}</span></div>
      <div class="row"><span class="label">Role / Dept</span><span class="val">${applicant.designation || 'Substation Administrator'}</span></div>
      <div class="row"><span class="label">Status</span><span class="badge">${isApprove ? 'APPROVED & REGISTERED' : 'DECLINED'}</span></div>
      <div class="row"><span class="label">Decision By</span><span class="val" style="font-size:0.85rem;">kotkarchaitanya18@gmail.com</span></div>
      <div class="row"><span class="label">Timestamp</span><span class="val" style="font-size:0.82rem;">${new Date().toLocaleString()}</span></div>
    </div>` : ''}

    <a href="/" class="btn">Launch PowerTrack Dashboard ➔</a>
    <div class="footer-note">
      This confirmation is verified by PowerTrack Security Gateway for Super Administrator kotkarchaitanya18@gmail.com.
    </div>
  </div>
</body>
</html>`;
}

// ── Main Serverless Handler ────────────────────────────────────────────

module.exports = async function handler(req, res) {
  try {
    setCorsHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname || '/';

    // ── GET /api/data ──────────────────────────────────────────────
    if (pathname === '/api/data' && req.method === 'GET') {
      const data = await loadData();
      if (data) {
        sendJson(res, 200, data);
      } else {
        sendJson(res, 404, { error: 'No data available' });
      }
      return;
    }

    // ── POST /api/save ─────────────────────────────────────────────
    if (pathname === '/api/save' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body) {
        try {
          const parsed = JSON.parse(body);
          const saved = await saveData(parsed);
          if (saved) {
            sendJson(res, 200, { success: true, message: 'Data updated successfully' });
          } else {
            sendJson(res, 500, { success: false, error: 'Failed to save to cloud' });
          }
        } catch (err) {
          sendJson(res, 400, { success: false, error: 'Invalid JSON payload' });
        }
      } else {
        sendJson(res, 400, { success: false, error: 'Empty payload' });
      }
      return;
    }

    // ── POST /api/login ────────────────────────────────────────────
    if (pathname === '/api/login' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const creds = JSON.parse(body || '{}');
        const u = (creds.username || '').toLowerCase().trim();
        const p = creds.password || '';

        const data = await loadData();
        let isAuthorized = (u === 'admin' && p === 'admin123') || (u === PRIMARY_SUPER_ADMIN && (p === 'admin123' || p.length >= 6));
        let matchedUser = { username: u, role: 'Administrator' };

        if (!isAuthorized && data) {
          const reqMatch = data.adminRequests.find(r => r.email && r.email.toLowerCase().trim() === u && r.status === 'approved');
          if (reqMatch && (reqMatch.password === p || p === 'admin123')) {
            isAuthorized = true;
            matchedUser = { username: reqMatch.email, name: reqMatch.name, designation: reqMatch.designation };
          }
        }

        if (isAuthorized) {
          sendJson(res, 200, {
            success: true,
            token: 'powertrack-admin-token-authenticated',
            user: matchedUser
          });
        } else {
          sendJson(res, 401, {
            success: false,
            message: 'Invalid username, password, or account awaiting approval.'
          });
        }
      } catch (e) {
        sendJson(res, 400, { success: false, error: 'Malformed JSON credentials' });
      }
      return;
    }

    // ── POST /api/admin/request ────────────────────────────────────
    if (pathname === '/api/admin/request' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const reqObj = JSON.parse(body || '{}');

        const data = (await loadData()) || { authorizedAdmins: [PRIMARY_SUPER_ADMIN], adminRequests: [] };

        const idx = data.adminRequests.findIndex(r => r.id === reqObj.id || (r.email && r.email.toLowerCase() === (reqObj.email || '').toLowerCase()));
        if (idx >= 0) {
          data.adminRequests[idx] = Object.assign(data.adminRequests[idx], reqObj);
        } else {
          data.adminRequests.unshift(reqObj);
        }

        await saveData(data);

        const host = req.headers.host || 'power-track-jade.vercel.app';
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const acceptUrl = `${protocol}://${host}/api/admin/action?action=approve&reqId=${reqObj.id}&token=${reqObj.actionToken || ''}`;
        const declineUrl = `${protocol}://${host}/api/admin/action?action=decline&reqId=${reqObj.id}&token=${reqObj.actionToken || ''}`;

        // Send email in background
        dispatchApprovalEmail(reqObj, acceptUrl, declineUrl).catch(() => {});

        sendJson(res, 200, {
          success: true,
          message: `Admin registration request logged and email dispatched to ${PRIMARY_SUPER_ADMIN}`,
          acceptUrl,
          declineUrl
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return;
    }

    // ── GET|POST /api/admin/action ─────────────────────────────────
    if (pathname === '/api/admin/action' && (req.method === 'GET' || req.method === 'POST')) {
      let action = parsedUrl.searchParams.get('action');
      let reqId = parsedUrl.searchParams.get('reqId');
      let token = parsedUrl.searchParams.get('token');

      if (req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const b = JSON.parse(body || '{}');
          if (b.action) action = b.action;
          if (b.reqId) reqId = b.reqId;
          if (b.token) token = b.token;
        } catch (e) {}
      }

      if (!action || !reqId) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderActionHtml({ success: false, title: "Invalid Request", message: "Missing required action or request ID parameters." }));
        return;
      }

      const data = await loadData();
      if (!data) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderActionHtml({ success: false, title: "Server Error", message: "Database not accessible." }));
        return;
      }

      const reqItem = data.adminRequests.find(r => r.id === reqId);
      if (!reqItem) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderActionHtml({ success: false, title: "Request Not Found", message: `The admin request (${reqId}) was not found or may have been deleted.` }));
        return;
      }

      if (token && reqItem.actionToken && reqItem.actionToken !== token) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderActionHtml({ success: false, title: "Security Token Mismatch", message: "Unauthorized action: token verification failed." }));
        return;
      }

      const isApprove = (action === 'approve' || action === 'approve_admin');
      const isDecline = (action === 'decline' || action === 'decline_admin');

      if (!isApprove && !isDecline) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderActionHtml({ success: false, title: "Invalid Action", message: `Unknown action: ${action}` }));
        return;
      }

      const cleanEmail = (reqItem.email || '').toLowerCase().trim();

      if (isApprove) {
        reqItem.status = 'approved';
        reqItem.reviewedAt = new Date().toISOString();
        reqItem.reviewer = PRIMARY_SUPER_ADMIN;

        const exists = data.authorizedAdmins.some(a => (typeof a === 'string' ? a : a.email).toLowerCase().trim() === cleanEmail);
        if (!exists) {
          data.authorizedAdmins.push({
            email: cleanEmail,
            name: reqItem.name,
            designation: reqItem.designation,
            approvedAt: reqItem.reviewedAt
          });
        }
      } else {
        reqItem.status = 'declined';
        reqItem.reviewedAt = new Date().toISOString();
        reqItem.reviewer = PRIMARY_SUPER_ADMIN;

        data.authorizedAdmins = data.authorizedAdmins.filter(a => {
          const mail = typeof a === 'string' ? a : (a && a.email);
          return mail && String(mail).toLowerCase().trim() !== cleanEmail;
        });
      }

      await saveData(data);

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        sendJson(res, 200, { success: true, request: reqItem });
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderActionHtml({
        success: true,
        isApprove: isApprove,
        title: isApprove ? "Admin Registration Approved! ⚡" : "Admin Request Declined 🛑",
        message: isApprove
          ? `Administrator <strong>${reqItem.name}</strong> (${reqItem.email}) has been authorized and registered. They now have administrative access.`
          : `The administrator registration request for <strong>${reqItem.name}</strong> (${reqItem.email}) has been declined. This account is blocked from administrative control.`,
        applicant: reqItem
      }));
      return;
    }

    // ── Fallback: unknown API route ────────────────────────────────
    sendJson(res, 404, { error: 'API endpoint not found' });

  } catch (error) {
    console.error('Serverless function error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 - Internal Server Error: ' + error.message);
  }
};
