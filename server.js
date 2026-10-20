#!/usr/bin/env node
/**
 * PowerTrack Local HTTP & REST API Server
 * Zero external dependencies - Runs natively with Node.js on macOS, Linux, and Windows.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 8085;
const SCRIPT_DIR = __dirname;
const DATA_FILE = path.join(SCRIPT_DIR, 'data.json');
const PRIMARY_SUPER_ADMIN = 'kotkarchaitanya18@gmail.com';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function loadDataJson() {
  if (!fs.existsSync(DATA_FILE)) return null;
  const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.authorizedAdmins)) data.authorizedAdmins = [PRIMARY_SUPER_ADMIN];
  if (!Array.isArray(data.adminRequests)) data.adminRequests = [];
  return data;
}

function saveDataJson(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
  const accentColor = isApprove ? '#10b981' : (success === false ? '#ef4444' : '#ef4444');
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
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid ${accentColor};
      border-radius: 20px;
      padding: 2.75rem 2.25rem;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 50px rgba(16, 185, 129, 0.15);
      text-align: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #38bdf8;
      font-size: 0.85rem;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
      padding: 0.35rem 0.9rem;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 999px;
    }
    .icon {
      font-size: 3.5rem;
      margin-bottom: 1.25rem;
      display: block;
    }
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: ${accentColor};
      margin-bottom: 0.75rem;
      line-height: 1.25;
    }
    p {
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .details {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      text-align: left;
      margin-bottom: 2rem;
      font-size: 0.92rem;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 0.45rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; }
    .val { color: #f8fafc; font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      background: ${isApprove ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};
      color: ${accentColor};
      border: 1px solid ${accentColor};
    }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      padding: 0.85rem 2rem;
      border-radius: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
    }
    .btn:hover {
      background: #0284c7;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
    }
    .footer-note {
      margin-top: 1.75rem;
      font-size: 0.78rem;
      color: #475569;
    }
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
      <div class="row">
        <span class="label">Applicant Name</span>
        <span class="val">${applicant.name || 'Administrator'}</span>
      </div>
      <div class="row">
        <span class="label">Admin Email</span>
        <span class="val" style="color:#38bdf8; font-family:'JetBrains Mono', monospace;">${applicant.email}</span>
      </div>
      <div class="row">
        <span class="label">Role / Dept</span>
        <span class="val">${applicant.designation || 'Substation Administrator'}</span>
      </div>
      <div class="row">
        <span class="label">Status</span>
        <span class="badge">${isApprove ? 'APPROVED & REGISTERED' : 'DECLINED'}</span>
      </div>
      <div class="row">
        <span class="label">Decision By</span>
        <span class="val" style="font-size:0.85rem;">kotkarchaitanya18@gmail.com</span>
      </div>
      <div class="row">
        <span class="label">Timestamp</span>
        <span class="val" style="font-size:0.82rem;">${new Date().toLocaleString()}</span>
      </div>
    </div>` : ''}

    <a href="http://localhost:8085/" class="btn">Launch PowerTrack Dashboard ➔</a>

    <div class="footer-note">
      This confirmation is verified by PowerTrack Security Gateway for Super Administrator kotkarchaitanya18@gmail.com.
    </div>
  </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname || '/';

    // ---------------- REST API ROUTES ----------------
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/data' && req.method === 'GET') {
        const data = loadDataJson();
        if (data) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(data));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'data.json not found' }));
        }
        return;
      }

      if (pathname === '/api/save' && req.method === 'POST') {
        const body = await readBody(req);
        if (body) {
          try {
            const parsed = JSON.parse(body);
            saveDataJson(parsed);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, message: 'Data updated successfully' }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Empty payload' }));
        }
        return;
      }

      if (pathname === '/api/login' && req.method === 'POST') {
        try {
          const body = await readBody(req);
          const creds = JSON.parse(body || '{}');
          const u = (creds.username || '').toLowerCase().trim();
          const p = creds.password || '';

          const data = loadDataJson();
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
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              token: 'powertrack-admin-token-authenticated',
              user: matchedUser
            }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              message: 'Invalid username, password, or account awaiting approval.'
            }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Malformed JSON credentials' }));
        }
        return;
      }

      if (pathname === '/api/admin/request' && req.method === 'POST') {
        try {
          const body = await readBody(req);
          const reqObj = JSON.parse(body || '{}');

          const data = loadDataJson() || { authorizedAdmins: [PRIMARY_SUPER_ADMIN], adminRequests: [] };

          const idx = data.adminRequests.findIndex(r => r.id === reqObj.id || (r.email && r.email.toLowerCase() === (reqObj.email || '').toLowerCase()));
          if (idx >= 0) {
            data.adminRequests[idx] = Object.assign(data.adminRequests[idx], reqObj);
          } else {
            data.adminRequests.unshift(reqObj);
          }

          saveDataJson(data);

          const host = req.headers.host || `localhost:${DEFAULT_PORT}`;
          const acceptUrl = `http://${host}/api/admin/action?action=approve&reqId=${reqObj.id}&token=${reqObj.actionToken || ''}`;
          const declineUrl = `http://${host}/api/admin/action?action=decline&reqId=${reqObj.id}&token=${reqObj.actionToken || ''}`;

          console.log('\n\x1b[33m==========================================================\x1b[0m');
          console.log('\x1b[32m⚡ NEW ADMIN REGISTRATION REQUEST RECEIVED\x1b[0m');
          console.log('\x1b[33m==========================================================\x1b[0m');
          console.log(` Applicant: ${reqObj.name}`);
          console.log(` Email: ${reqObj.email}`);
          console.log(` Role: ${reqObj.designation || 'Administrator'}`);
          console.log(` 📧 Dispatching email to: ${PRIMARY_SUPER_ADMIN}`);
          console.log(`\n \x1b[32m⚡ ACCEPT & REGISTER LINK:\x1b[0m\n ${acceptUrl}`);
          console.log(`\n \x1b[31m❌ DECLINE LINK:\x1b[0m\n ${declineUrl}`);
          console.log('\x1b[33m==========================================================\x1b[0m\n');

          // Send email in background to kotkarchaitanya18@gmail.com
          dispatchApprovalEmail(reqObj, acceptUrl, declineUrl).catch(() => {});

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: `Admin registration request logged and email dispatched to ${PRIMARY_SUPER_ADMIN}`,
            acceptUrl,
            declineUrl
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      if (pathname === '/api/admin/action' && (req.method === 'GET' || req.method === 'POST')) {
        let action = parsedUrl.searchParams.get('action');
        let reqId = parsedUrl.searchParams.get('reqId');
        let token = parsedUrl.searchParams.get('token');

        if (req.method === 'POST') {
          try {
            const body = await readBody(req);
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

        const data = loadDataJson();
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

        saveDataJson(data);

        console.log(`\x1b[36m⚡ PowerTrack Admin Action:\x1b[0m ${isApprove ? 'APPROVED' : 'DECLINED'} for ${reqItem.name} (${reqItem.email})`);

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, request: reqItem }));
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

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
      return;
    }

    // ---------------- STATIC FILE SERVING ----------------
    let cleanPath = decodeURIComponent(pathname.replace(/^\/+/, ''));
    if (!cleanPath) cleanPath = 'index.html';

    let filePath = path.join(SCRIPT_DIR, cleanPath);

    // Guard against path traversal
    if (!filePath.startsWith(SCRIPT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    // Handle subroute asset prefixes like /admin/css/style.css -> /css/style.css
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const match = cleanPath.match(/(css\/.+|js\/.+|assets\/.+|data\.json|favicon\.ico)/);
      if (match) {
        const candidate = path.join(SCRIPT_DIR, match[1]);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          filePath = candidate;
        }
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA Fallback to index.html
      const fallback = path.join(SCRIPT_DIR, 'index.html');
      if (fs.existsSync(fallback)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(fallback).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File Not Found');
      }
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 - Internal Server Error: ' + error.message);
  }
});

function startServer(port) {
  server.listen(port, () => {
    console.log('\x1b[36m==========================================================\x1b[0m');
    console.log('\x1b[33m             ⚡ POWERTRACK SERVER RUNNING                \x1b[0m');
    console.log('\x1b[36m==========================================================\x1b[0m');
    console.log(`\x1b[32m URL: http://localhost:${port}/\x1b[0m`);
    console.log(` Serving directory: ${SCRIPT_DIR}`);
    console.log(` Data file: ${DATA_FILE}`);
    console.log(` Primary Super Admin: ${PRIMARY_SUPER_ADMIN}`);
    console.log(' Press Ctrl+C in this window to stop the server.');
    console.log('\x1b[36m==========================================================\x1b[0m');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
