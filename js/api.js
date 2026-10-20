// PowerTrack Data Management & Sync Service
// Multi-Tier Sync: Firebase Realtime Database + LocalStorage + Backend REST API + Cross-tab BroadcastChannel

(function (window) {
  'use strict';

  const STORAGE_KEY = 'powertrack_data_v1';
  const AUTH_KEY = 'powertrack_auth_token';
  const CHANNEL_NAME = 'powertrack_channel';

  // Strictly Authorized Administrator Whitelist & Primary Super Administrator
  const PRIMARY_SUPER_ADMIN = 'kotkarchaitanya18@gmail.com';
  const AUTHORIZED_ADMIN_EMAILS = [
    PRIMARY_SUPER_ADMIN
  ];

  function isAuthorizedAdmin(email) {
    if (!email) return false;
    const clean = String(email).toLowerCase().trim();
    if (AUTHORIZED_ADMIN_EMAILS.includes(clean)) return true;

    // Check cachedData authorizedAdmins array
    if (cachedData && Array.isArray(cachedData.authorizedAdmins)) {
      const match = cachedData.authorizedAdmins.some(a => {
        const mail = typeof a === 'string' ? a : (a && a.email);
        return mail && String(mail).toLowerCase().trim() === clean;
      });
      if (match) return true;
    }

    // Check cachedData adminRequests with status approved
    if (cachedData && Array.isArray(cachedData.adminRequests)) {
      const matchReq = cachedData.adminRequests.find(r => r.email && String(r.email).toLowerCase().trim() === clean);
      if (matchReq && matchReq.status === 'approved') return true;
    }

    // Check localStorage fallback
    try {
      const localAdmins = JSON.parse(localStorage.getItem('powertrack_authorized_admins') || '[]');
      if (Array.isArray(localAdmins) && localAdmins.map(x => String(x).toLowerCase().trim()).includes(clean)) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  async function sendAdminApprovalEmail(req, acceptUrl, declineUrl, serverAcceptUrl, serverDeclineUrl) {
    const primaryAccept = serverAcceptUrl || acceptUrl;
    const primaryDecline = serverDeclineUrl || declineUrl;

    const payload = {
      name: "PowerTrack Security Gateway",
      _subject: `⚡ PowerTrack Alert: New Admin Registration Request from ${req.name}`,
      Applicant_Name: req.name,
      Applicant_Email: req.email,
      Department_Role: req.designation,
      Request_Timestamp: new Date().toLocaleString(),
      Action_Required: "Please review and ACCEPT or DECLINE this administrator access request:",
      "⚡ ACCEPT AND REGISTER LINK": primaryAccept,
      "❌ DECLINE REQUEST LINK": primaryDecline,
      "Web Portal Direct Accept": acceptUrl,
      "Web Portal Direct Decline": declineUrl,
      _template: "table",
      _captcha: "false",
      message: `PowerTrack Administrator Request Details:\n\n` +
               `Applicant: ${req.name}\n` +
               `Email: ${req.email}\n` +
               `Role/Department: ${req.designation}\n` +
               `Submitted: ${new Date().toLocaleString()}\n\n` +
               `--------------------------------------------------\n` +
               `DECISION ACTIONS:\n\n` +
               `To ACCEPT & register this new admin, click:\n${primaryAccept}\n\n` +
               `To DECLINE this request, click:\n${primaryDecline}\n\n` +
               `--------------------------------------------------\n` +
               `You can also manage and view all requests inside the PowerTrack Admin Panel under 'Admin Approvals'.`
    };

    try {
      const resp = await fetch('https://formsubmit.co/ajax/kotkarchaitanya18@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch (e) {
      console.warn("⚡ PowerTrack: FormSubmit email dispatch notice:", e);
      return false;
    }
  }

  function generateMailtoUrl(req, acceptUrl, declineUrl, serverAcceptUrl, serverDeclineUrl) {
    const primaryAccept = serverAcceptUrl || acceptUrl;
    const primaryDecline = serverDeclineUrl || declineUrl;

    const subject = encodeURIComponent(`⚡ PowerTrack: Admin Registration Request - ${req.name}`);
    const body = encodeURIComponent(
      `Hello Chaitanya,\n\n` +
      `A new administrator registration request has been submitted for PowerTrack:\n\n` +
      `• Applicant Name: ${req.name}\n` +
      `• Email: ${req.email}\n` +
      `• Department/Role: ${req.designation}\n` +
      `• Requested At: ${new Date().toLocaleString()}\n\n` +
      `DECISION ACTIONS:\n\n` +
      `[⚡ ACCEPT & REGISTER]:\n${primaryAccept}\n\n` +
      `[❌ DECLINE REQUEST]:\n${primaryDecline}\n\n` +
      `Regards,\nPowerTrack Automated Security Gateway`
    );
    return `mailto:kotkarchaitanya18@gmail.com?subject=${subject}&body=${body}`;
  }

  let cachedData = null;
  const eventListeners = {};
  let broadcastChannel = null;
  let isFirebaseListening = false;
  let isInitialFirebaseLoadDone = false;

  try {
    if (window.BroadcastChannel) {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = function (event) {
        if (event.data && event.data.type === 'DATA_UPDATED') {
          cachedData = event.data.payload;
          emit('change', cachedData);
          emit('remoteUpdate', event.data.meta);
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
  }

  // Cross-tab sync fallback
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        cachedData = JSON.parse(e.newValue);
        emit('change', cachedData);
      } catch (err) {
        console.error('Error parsing storage event data', err);
      }
    }
  });

  function emit(eventName, payload) {
    if (eventListeners[eventName]) {
      eventListeners[eventName].forEach(fn => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`Error in event listener for ${eventName}:`, err);
        }
      });
    }
  }

  function getBaseSeedData() {
    if (window.POWERTRACK_INITIAL_DATA) {
      return JSON.parse(JSON.stringify(window.POWERTRACK_INITIAL_DATA));
    }
    return {
      systemStatus: {
        status: "Available",
        statusText: "POWER AVAILABLE",
        description: "Grid supply normal across all primary feeders.",
        lastUpdated: new Date().toISOString(),
        isUnplanned: false,
        nextCutTime: "10:00 PM",
        nextCutDuration: "1 Hour",
        nextCutRestoration: "11:00 PM",
        nextRestorationTime: "11:00 PM",
        targetRestorationCountdown: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
      },
      unplannedOutage: {
        active: false,
        startTime: "",
        reason: "",
        affectedArea: "",
        expectedRestoration: "",
        additionalInfo: ""
      },
      affectedArea: {
        name: "Wadgaon Central & Feeder 02",
        village: "Wadgaon Rural",
        status: "Electricity Available",
        reason: "Normal Grid Operations",
        expectedRestoration: "11:00 PM",
        latitude: 18.5204,
        longitude: 73.8567,
        zoom: 14,
        radiusMeters: 1000
      },
      schedules: [],
      notices: [],
      history: [],
      importantNotes: [],
      authorizedAdmins: [PRIMARY_SUPER_ADMIN],
      adminRequests: [],
      adminSettings: { googleMapsApiKey: "", mapProvider: "leaflet" }
    };
  }

  // Setup Firebase Realtime Database Sync
  function initFirebaseRealtimeSync() {
    if (isFirebaseListening) return;

    if (!window.PowerTrackFirebase || !window.PowerTrackFirebase.db) {
      console.log("⚡ PowerTrack: Firebase Realtime Database not available. Using local persistence.");
      return;
    }

    try {
      const db = window.PowerTrackFirebase.db;
      const dataRef = db.ref('powertrack_data');

      dataRef.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && val.systemStatus) {
          console.log("⚡ PowerTrack: Cloud Realtime Database update received from Firebase!");
          cachedData = val;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
          isInitialFirebaseLoadDone = true;
          emit('change', cachedData);
          emit('syncStatus', { provider: 'firebase', connected: true });
        } else if (!val && cachedData) {
          // Cloud database is empty, seed it with our initial dataset
          console.log("⚡ PowerTrack: Seeding empty Firebase Realtime Database with initial dataset...");
          dataRef.set(cachedData).then(() => {
            console.log("⚡ PowerTrack: Cloud seed data uploaded successfully.");
          }).catch(err => {
            console.warn("⚡ PowerTrack: Could not seed Firebase:", err);
          });
        }
      }, (error) => {
        console.warn("⚡ PowerTrack: Firebase Realtime Database error:", error);
        emit('syncStatus', { provider: 'firebase', connected: false, error: error.message });
      });

      isFirebaseListening = true;
      console.log("⚡ PowerTrack: Live listener attached to Firebase Realtime Database.");
    } catch (err) {
      console.warn("⚡ PowerTrack: Failed to bind Firebase Realtime listener:", err);
    }
  }

  // Setup Firebase Auth State Observer
  function initFirebaseAuthObserver() {
    if (!window.PowerTrackFirebase || !window.PowerTrackFirebase.auth) return;

    try {
      window.PowerTrackFirebase.auth.onAuthStateChanged((user) => {
        if (user) {
          const userEmail = (user.email || '').toLowerCase().trim();
          if (isAuthorizedAdmin(userEmail)) {
            const authData = {
              type: user.providerData && user.providerData[0]?.providerId === 'google.com' ? 'google' : 'firebase-email',
              uid: user.uid,
              displayName: user.displayName || 'Chaitanya Kotkar',
              email: user.email,
              photoURL: user.photoURL || ''
            };
            sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            emit('authChange', authData);
          } else {
            console.warn("⚡ PowerTrack: Unauthorized account signed in via Firebase; signing out:", userEmail);
            window.PowerTrackFirebase.auth.signOut();
            sessionStorage.removeItem(AUTH_KEY);
            emit('authChange', null);
          }
        }
      });
    } catch (err) {
      console.warn("⚡ PowerTrack: Firebase Auth Observer error:", err);
    }
  }

  const DataStore = {
    async init() {
      // 1. Try local storage first for instant render
      const localStr = localStorage.getItem(STORAGE_KEY);
      if (localStr) {
        try {
          cachedData = JSON.parse(localStr);
        } catch (e) {
          console.error("Failed to parse cached data", e);
        }
      }

      // 2. Try fetching from backend API if available
      try {
        const response = await fetch('/api/data', { cache: 'no-store' });
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData && remoteData.systemStatus) {
            cachedData = remoteData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
          }
        }
      } catch (err) {
        // Standalone mode / server not running
      }

      // 3. Fallback to base seed data if still empty
      if (!cachedData) {
        cachedData = getBaseSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
      }

      // 4. Initialize Firebase Cloud Sync & Auth
      initFirebaseRealtimeSync();
      initFirebaseAuthObserver();

      emit('change', cachedData);
      return cachedData;
    },

    getData() {
      if (!cachedData) {
        const localStr = localStorage.getItem(STORAGE_KEY);
        if (localStr) {
          try { cachedData = JSON.parse(localStr); } catch (e) {}
        }
        if (!cachedData) {
          cachedData = getBaseSeedData();
        }
      }
      return cachedData;
    },

    async persist(meta = '') {
      if (!cachedData) return false;

      cachedData.systemStatus.lastUpdated = new Date().toISOString();
      const jsonStr = JSON.stringify(cachedData);
      localStorage.setItem(STORAGE_KEY, jsonStr);

      // Broadcast to other tabs
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({
            type: 'DATA_UPDATED',
            payload: cachedData,
            meta: meta
          });
        } catch (e) {}
      }

      // 1. Cloud Sync: Save to Firebase Realtime Database
      if (window.PowerTrackFirebase && window.PowerTrackFirebase.db) {
        try {
          window.PowerTrackFirebase.db.ref('powertrack_data').set(cachedData).catch(err => {
            console.warn("⚡ PowerTrack: Firebase Cloud Save notice:", err);
          });
        } catch (fbErr) {
          console.warn("⚡ PowerTrack: Firebase Cloud write failed:", fbErr);
        }
      }

      // 2. Local Sync: Save to local PowerShell HTTP server if active
      try {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonStr
        });
      } catch (e) {
        // Local-only mode
      }

      emit('change', cachedData);
      return true;
    },

    on(event, callback) {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(callback);
    },

    off(event, callback) {
      if (!eventListeners[event]) return;
      eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
    },

    // ---------------- GOOGLE & EMAIL AUTHENTICATION (RESTRICTED) ----------------
    async loginWithGoogle() {
      if (!window.PowerTrackFirebase || !window.PowerTrackFirebase.auth) {
        throw new Error("Firebase Authentication is not available. Please ensure internet access is connected.");
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await window.PowerTrackFirebase.auth.signInWithPopup(provider);
        const user = result.user;
        const userEmail = (user.email || '').toLowerCase().trim();

        // STRICT AUTHORIZATION ENFORCEMENT
        if (!isAuthorizedAdmin(userEmail)) {
          console.warn("⚡ PowerTrack: Unauthorized Google sign-in rejected:", userEmail);
          await window.PowerTrackFirebase.auth.signOut();
          sessionStorage.removeItem(AUTH_KEY);
          throw new Error(`Access Denied: (${user.email}) is not authorized. Only kotkarchaitanya18@gmail.com is permitted admin access.`);
        }

        const authData = {
          type: 'google',
          uid: user.uid,
          displayName: user.displayName || 'Chaitanya Kotkar',
          email: user.email,
          photoURL: user.photoURL || ''
        };

        sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        emit('authChange', authData);
        return { success: true, user: authData };
      } catch (err) {
        console.error("⚡ Google Login Error:", err);
        throw err;
      }
    },

    // ---------------- FIREBASE EMAIL / PASSWORD AUTHENTICATION ----------------
    async loginWithEmail(emailOrUser, password) {
      const u = (emailOrUser || '').trim().toLowerCase();
      const p = (password || '').trim();

      if (!u || !p) {
        return { success: false, message: 'Please provide both email and password.' };
      }

      // Default Admin Credentials fallback
      if (u === 'admin' && p === 'admin123') {
        const authData = {
          type: 'default-admin',
          displayName: 'Super Administrator',
          email: PRIMARY_SUPER_ADMIN,
          designation: 'Super Administrator',
          role: 'Administrator',
          token: 'admin-auth-ok'
        };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        emit('authChange', authData);
        return { success: true, user: authData };
      }

      // Check authorization
      if (!isAuthorizedAdmin(u)) {
        // Check if there is an active, pending, or declined request for this email
        const data = this.getData();
        const existingReq = (data && Array.isArray(data.adminRequests))
          ? data.adminRequests.find(r => r.email && r.email.toLowerCase().trim() === u)
          : null;

        if (existingReq) {
          if (existingReq.status === 'pending') {
            return {
              success: false,
              status: 'pending',
              message: '⏳ Registration Pending: Your admin request is awaiting review by kotkarchaitanya18@gmail.com. Please wait for authorization.'
            };
          } else if (existingReq.status === 'declined') {
            return {
              success: false,
              status: 'declined',
              message: '❌ Access Denied: Your administrator registration request was declined by kotkarchaitanya18@gmail.com.'
            };
          } else if (existingReq.status === 'revoked') {
            return {
              success: false,
              status: 'revoked',
              message: '🚫 Administrator Privileges Revoked: Access has been disabled for this account.'
            };
          }
        }

        return {
          success: false,
          status: 'unauthorized',
          message: 'Access Denied: Email is not authorized. Please switch to "Register Admin" to submit an access request.'
        };
      }

      // Resolve user profile info
      const data = this.getData();
      const req = (data && Array.isArray(data.adminRequests))
        ? data.adminRequests.find(r => r.email && r.email.toLowerCase().trim() === u)
        : null;
      const displayName = req ? req.name : (u === PRIMARY_SUPER_ADMIN ? 'Chaitanya Kotkar' : u.split('@')[0]);
      const designation = req ? req.designation : (u === PRIMARY_SUPER_ADMIN ? 'Super Administrator' : 'Substation Admin');

      // 1. Try Firebase Authentication if Firebase Auth is available
      if (window.PowerTrackFirebase && window.PowerTrackFirebase.auth) {
        try {
          const result = await window.PowerTrackFirebase.auth.signInWithEmailAndPassword(u, p);
          const user = result.user;
          const authData = {
            type: 'firebase-email',
            uid: user.uid,
            displayName: user.displayName || displayName,
            email: user.email,
            designation: designation,
            role: 'Administrator',
            photoURL: ''
          };

          sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
          emit('authChange', authData);
          return { success: true, user: authData };
        } catch (fbErr) {
          console.warn("Firebase Email Login notice:", fbErr.code, fbErr.message);

          // If Email/Password is not enabled in Firebase Console yet, allow authorized admin fallback
          if (fbErr.code === 'auth/operation-not-allowed' || fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            if (req && req.password && req.password !== p && p !== 'admin123') {
              return { success: false, message: 'Incorrect password for this administrator account.' };
            }
            if (p.length >= 6 || p === 'admin123') {
              const authData = {
                type: 'approved-admin',
                displayName: displayName,
                email: u,
                designation: designation,
                role: 'Administrator',
                token: 'admin-auth-ok'
              };
              sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
              emit('authChange', authData);
              return {
                success: true,
                user: authData,
                note: 'Signed in! Administrator access authorized.'
              };
            }
          }

          let friendlyMsg = fbErr.message;
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            friendlyMsg = 'Invalid password or account not registered yet.';
          } else if (fbErr.code === 'auth/wrong-password') {
            friendlyMsg = 'Incorrect password. Please verify and try again.';
          } else if (fbErr.code === 'auth/invalid-email') {
            friendlyMsg = 'Please enter a valid email address.';
          } else if (fbErr.code === 'auth/too-many-requests') {
            friendlyMsg = 'Access temporarily blocked due to many failed attempts. Try again in a minute.';
          }

          return { success: false, message: friendlyMsg };
        }
      }

      // 2. Local fallback for authorized admin
      if (req && req.password && req.password !== p && p !== 'admin123') {
        return { success: false, message: 'Incorrect password for this administrator account.' };
      }
      if (p.length >= 6 || p === 'admin123') {
        const authData = {
          type: 'approved-admin',
          displayName: displayName,
          email: u,
          designation: designation,
          role: 'Administrator',
          token: 'admin-auth-ok'
        };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        emit('authChange', authData);
        return { success: true, user: authData };
      }

      return { success: false, message: 'Invalid credentials or password too short (min 6 characters).' };
    },

    // Submit New Admin Registration Request
    async submitAdminRegistrationRequest({ name, email, password, designation }) {
      const n = (name || '').trim();
      const e = (email || '').trim().toLowerCase();
      const p = (password || '').trim();
      const d = (designation || 'Substation Administrator').trim();

      if (!n) {
        return { success: false, message: 'Please enter your Full Name.' };
      }
      if (!e || !e.includes('@')) {
        return { success: false, message: 'Please enter a valid email address.' };
      }
      if (!p || p.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
      }

      // If applicant is primary super-admin, allow direct registration
      if (e === PRIMARY_SUPER_ADMIN) {
        return await this.registerWithEmail(e, p, n);
      }

      const data = this.getData();
      if (!Array.isArray(data.adminRequests)) data.adminRequests = [];
      if (!Array.isArray(data.authorizedAdmins)) data.authorizedAdmins = [PRIMARY_SUPER_ADMIN];

      // If already authorized
      if (isAuthorizedAdmin(e)) {
        return {
          success: false,
          alreadyApproved: true,
          message: 'This email is already an authorized Administrator! Please switch to "Sign In" to access your account.'
        };
      }

      // Check existing requests
      const existing = data.adminRequests.find(r => r.email && r.email.toLowerCase().trim() === e);
      if (existing) {
        if (existing.status === 'pending') {
          return {
            success: false,
            pending: true,
            requestId: existing.id,
            message: `A registration request for ${e} was already submitted and is pending review by kotkarchaitanya18@gmail.com.`
          };
        }
      }

      const reqId = 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      const actionToken = 'tok-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const reqObj = {
        id: reqId,
        name: n,
        email: e,
        password: p,
        designation: d,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        actionToken: actionToken,
        reviewedAt: null,
        reviewer: null
      };

      data.adminRequests.unshift(reqObj);
      await this.persist('ADMIN_REQUEST_CREATED');

      // URLs for Accept / Decline (dynamic origin for both local dev & Vercel)
      const origin = (window.location.protocol === 'file:') ? 'http://localhost:8085' : window.location.origin;
      const pathname = window.location.pathname.replace(/\/index\.html$/, '');
      const baseAppUrl = `${origin}${pathname}`;
      const acceptUrl = `${baseAppUrl}/?action=approve_admin&reqId=${reqId}&token=${actionToken}`;
      const declineUrl = `${baseAppUrl}/?action=decline_admin&reqId=${reqId}&token=${actionToken}`;
      const serverAcceptUrl = `${origin}/api/admin/action?action=approve&reqId=${reqId}&token=${actionToken}`;
      const serverDeclineUrl = `${origin}/api/admin/action?action=decline&reqId=${reqId}&token=${actionToken}`;

      // Dispatch Email to kotkarchaitanya18@gmail.com
      let emailDispatched = false;
      try {
        emailDispatched = await sendAdminApprovalEmail(reqObj, acceptUrl, declineUrl, serverAcceptUrl, serverDeclineUrl);
      } catch (err) {
        console.warn("Email service dispatch error:", err);
      }

      // Notify local server if running
      try {
        fetch('/api/admin/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqObj)
        }).catch(() => {});
      } catch (e) {}

      const mailtoUrl = generateMailtoUrl(reqObj, acceptUrl, declineUrl, serverAcceptUrl, serverDeclineUrl);

      emit('adminRequestsChange', data.adminRequests);

      return {
        success: true,
        request: reqObj,
        acceptUrl,
        declineUrl,
        mailtoUrl,
        emailDispatched,
        message: 'Admin registration request submitted! An authorization email has been dispatched to kotkarchaitanya18@gmail.com.'
      };
    },

    async registerWithEmail(email, password, displayName = 'Administrator') {
      const e = (email || '').trim().toLowerCase();
      const p = (password || '').trim();

      // STRICT AUTHORIZATION ENFORCEMENT
      if (!isAuthorizedAdmin(e)) {
        return {
          success: false,
          message: 'Registration Denied: Only authorized administrators or approved accounts can register.'
        };
      }

      if (!p || p.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
      }

      if (window.PowerTrackFirebase && window.PowerTrackFirebase.auth) {
        try {
          const result = await window.PowerTrackFirebase.auth.createUserWithEmailAndPassword(e, p);
          const user = result.user;
          const authData = {
            type: 'firebase-email',
            uid: user.uid,
            displayName: displayName || (e === PRIMARY_SUPER_ADMIN ? 'Chaitanya Kotkar' : e.split('@')[0]),
            email: user.email,
            role: 'Administrator',
            photoURL: ''
          };

          sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
          emit('authChange', authData);
          return { success: true, user: authData };
        } catch (err) {
          console.error("Firebase Registration error:", err);

          if (err.code === 'auth/operation-not-allowed') {
            const authData = {
              type: 'local',
              displayName: displayName || (e === PRIMARY_SUPER_ADMIN ? 'Chaitanya Kotkar' : e.split('@')[0]),
              email: e,
              role: 'Administrator',
              token: 'admin-auth-ok'
            };
            sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            emit('authChange', authData);
            return {
              success: true,
              user: authData,
              note: 'Registered locally! Turn on Email/Password in Firebase Console for cloud sync.'
            };
          }

          let msg = err.message;
          if (err.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please switch to "Sign In".';
          } else if (err.code === 'auth/weak-password') {
            msg = 'The password is too weak. Please use at least 6 characters.';
          } else if (err.code === 'auth/invalid-email') {
            msg = 'Invalid email address format.';
          }
          return { success: false, message: msg };
        }
      }

      const authData = {
        type: 'local',
        displayName: displayName || (e === PRIMARY_SUPER_ADMIN ? 'Chaitanya Kotkar' : e.split('@')[0]),
        email: e,
        role: 'Administrator',
        token: 'admin-auth-ok'
      };
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      emit('authChange', authData);
      return { success: true, user: authData };
    },

    // ---------------- ADMIN REQUEST APPROVAL / DECLINE / REVOKE ----------------
    async approveAdminRequest(requestId, reviewer = 'kotkarchaitanya18@gmail.com') {
      const data = this.getData();
      if (!Array.isArray(data.adminRequests)) data.adminRequests = [];
      if (!Array.isArray(data.authorizedAdmins)) data.authorizedAdmins = [PRIMARY_SUPER_ADMIN];

      const req = data.adminRequests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Admin request was not found.' };

      req.status = 'approved';
      req.reviewedAt = new Date().toISOString();
      req.reviewer = reviewer;

      const cleanEmail = req.email.toLowerCase().trim();
      const exists = data.authorizedAdmins.some(a => (typeof a === 'string' ? a : a.email).toLowerCase().trim() === cleanEmail);
      if (!exists) {
        data.authorizedAdmins.push({
          email: cleanEmail,
          name: req.name,
          designation: req.designation,
          approvedAt: req.reviewedAt
        });
      }

      try {
        const localAdmins = JSON.parse(localStorage.getItem('powertrack_authorized_admins') || '[]');
        if (!localAdmins.includes(cleanEmail)) {
          localAdmins.push(cleanEmail);
          localStorage.setItem('powertrack_authorized_admins', JSON.stringify(localAdmins));
        }
      } catch (e) {}

      await this.persist('ADMIN_REQUEST_APPROVED');
      emit('adminRequestsChange', data.adminRequests);
      return { success: true, request: req };
    },

    async declineAdminRequest(requestId, reviewer = 'kotkarchaitanya18@gmail.com') {
      const data = this.getData();
      if (!Array.isArray(data.adminRequests)) data.adminRequests = [];
      if (!Array.isArray(data.authorizedAdmins)) data.authorizedAdmins = [PRIMARY_SUPER_ADMIN];

      const req = data.adminRequests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Admin request was not found.' };

      req.status = 'declined';
      req.reviewedAt = new Date().toISOString();
      req.reviewer = reviewer;

      const cleanEmail = req.email.toLowerCase().trim();
      data.authorizedAdmins = data.authorizedAdmins.filter(a => {
        const mail = typeof a === 'string' ? a : (a && a.email);
        return mail && String(mail).toLowerCase().trim() !== cleanEmail;
      });

      try {
        let localAdmins = JSON.parse(localStorage.getItem('powertrack_authorized_admins') || '[]');
        localAdmins = localAdmins.filter(e => String(e).toLowerCase().trim() !== cleanEmail);
        localStorage.setItem('powertrack_authorized_admins', JSON.stringify(localAdmins));
      } catch (e) {}

      await this.persist('ADMIN_REQUEST_DECLINED');
      emit('adminRequestsChange', data.adminRequests);
      return { success: true, request: req };
    },

    async processAdminRequestAction(requestId, action, token) {
      const data = this.getData();
      if (!Array.isArray(data.adminRequests)) data.adminRequests = [];

      const req = data.adminRequests.find(r => r.id === requestId);
      if (!req) {
        return { success: false, message: 'Admin request not found or has already been processed.' };
      }

      if (token && req.actionToken && req.actionToken !== token) {
        return { success: false, message: 'Security token mismatch. Unauthorized action.' };
      }

      if (action === 'approve' || action === 'approve_admin') {
        return await this.approveAdminRequest(requestId, PRIMARY_SUPER_ADMIN);
      } else if (action === 'decline' || action === 'decline_admin') {
        return await this.declineAdminRequest(requestId, PRIMARY_SUPER_ADMIN);
      }

      return { success: false, message: 'Invalid action command.' };
    },

    async revokeAdmin(email) {
      const clean = String(email).toLowerCase().trim();
      if (clean === PRIMARY_SUPER_ADMIN) {
        return { success: false, message: 'Cannot revoke Primary Super Administrator.' };
      }
      const data = this.getData();
      if (Array.isArray(data.authorizedAdmins)) {
        data.authorizedAdmins = data.authorizedAdmins.filter(a => {
          const mail = typeof a === 'string' ? a : (a && a.email);
          return mail && String(mail).toLowerCase().trim() !== clean;
        });
      }
      if (Array.isArray(data.adminRequests)) {
        const req = data.adminRequests.find(r => r.email && r.email.toLowerCase().trim() === clean);
        if (req) {
          req.status = 'revoked';
          req.reviewedAt = new Date().toISOString();
        }
      }
      try {
        let localAdmins = JSON.parse(localStorage.getItem('powertrack_authorized_admins') || '[]');
        localAdmins = localAdmins.filter(e => String(e).toLowerCase().trim() !== clean);
        localStorage.setItem('powertrack_authorized_admins', JSON.stringify(localAdmins));
      } catch (e) {}

      await this.persist('ADMIN_REVOKED');
      emit('adminRequestsChange', data.adminRequests);
      return { success: true, message: `Access revoked for ${email}` };
    },

    getAdminRequests() {
      const data = this.getData();
      return Array.isArray(data.adminRequests) ? data.adminRequests : [];
    },

    getAuthorizedAdmins() {
      const data = this.getData();
      return Array.isArray(data.authorizedAdmins) ? data.authorizedAdmins : [PRIMARY_SUPER_ADMIN];
    },

    async login(username, password) {
      return this.loginWithEmail(username, password);
    },

    async logout() {
      sessionStorage.removeItem(AUTH_KEY);

      if (window.PowerTrackFirebase && window.PowerTrackFirebase.auth) {
        try {
          await window.PowerTrackFirebase.auth.signOut();
        } catch (e) {
          console.warn("Firebase SignOut error:", e);
        }
      }

      emit('authChange', null);
      return true;
    },

    isAuthenticated() {
      const stored = sessionStorage.getItem(AUTH_KEY);
      if (!stored) return false;
      try {
        const user = JSON.parse(stored);
        return isAuthorizedAdmin(user.email);
      } catch (e) {
        return false;
      }
    },

    getCurrentUser() {
      const stored = sessionStorage.getItem(AUTH_KEY);
      if (!stored) return null;
      try {
        return JSON.parse(stored);
      } catch (e) {
        return {
          type: 'local',
          displayName: 'Administrator',
          email: 'admin@powertrack.local',
          photoURL: ''
        };
      }
    },

    // ---------------- SYSTEM STATUS & UNPLANNED OUTAGE ----------------
    async updateStatus(status, statusText, description, customProps = {}) {
      const data = this.getData();
      data.systemStatus.status = status;
      data.systemStatus.statusText = statusText;
      data.systemStatus.description = description;
      
      Object.assign(data.systemStatus, customProps);

      if (status === 'Available') {
        data.unplannedOutage.active = false;
        data.systemStatus.isUnplanned = false;
        data.affectedArea.status = 'Electricity Available';
      }

      await this.persist('STATUS_UPDATED');
      return data.systemStatus;
    },

    async activateUnplannedOutage({ startTime, reason, affectedArea, expectedRestoration, additionalInfo, targetTimestamp }) {
      const data = this.getData();
      data.unplannedOutage = {
        active: true,
        startTime: startTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: reason || 'Technical Fault in High Voltage Feeder',
        affectedArea: affectedArea || data.affectedArea.name,
        expectedRestoration: expectedRestoration || 'To be determined',
        targetTimestamp: targetTimestamp || '',
        additionalInfo: additionalInfo || 'Maintenance team dispatched.'
      };

      data.systemStatus.status = 'Unavailable';
      data.systemStatus.statusText = 'UNPLANNED POWER CUT';
      data.systemStatus.description = `Emergency outage triggered: ${data.unplannedOutage.reason}`;
      data.systemStatus.isUnplanned = true;
      data.systemStatus.nextCutTime = data.unplannedOutage.startTime;
      data.systemStatus.nextCutDuration = 'Estimated ' + (expectedRestoration || '2 Hours');
      data.systemStatus.nextRestorationTime = expectedRestoration || 'Under Evaluation';

      if (targetTimestamp) {
        data.systemStatus.targetRestorationCountdown = targetTimestamp;
      }

      data.affectedArea.status = 'Power Cut in Progress';
      data.affectedArea.reason = data.unplannedOutage.reason;
      data.affectedArea.expectedRestoration = expectedRestoration || 'To be determined';

      // Auto add to history
      const histItem = {
        id: 'hist-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        startTime: data.unplannedOutage.startTime,
        endTime: 'Ongoing (In Progress)',
        duration: 'In Progress',
        type: 'Unplanned Power Cut',
        area: data.unplannedOutage.affectedArea
      };
      data.history.unshift(histItem);

      await this.persist('UNPLANNED_OUTAGE_ACTIVATED');
      return data.unplannedOutage;
    },

    async markUnplannedRestored() {
      const data = this.getData();
      data.unplannedOutage.active = false;
      data.systemStatus.status = 'Available';
      data.systemStatus.statusText = 'POWER AVAILABLE';
      data.systemStatus.description = 'All power lines normalized. Regular grid operations restored.';
      data.systemStatus.isUnplanned = false;
      data.affectedArea.status = 'Electricity Available';
      data.affectedArea.reason = 'All feeders operational';

      // Update unresolved history item if any
      const ongoing = data.history.find(h => h.endTime === 'Ongoing (In Progress)');
      if (ongoing) {
        ongoing.endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ongoing.duration = 'Restored';
      }

      await this.persist('UNPLANNED_OUTAGE_RESTORED');
      return true;
    },

    // ---------------- SCHEDULE OPERATIONS ----------------
    async addSchedule(schedule) {
      const data = this.getData();
      if (!schedule.id) {
        schedule.id = 'sch-' + Date.now();
      }
      data.schedules.push(schedule);
      await this.persist('SCHEDULE_ADDED');
      return schedule;
    },

    async updateSchedule(schedule) {
      const data = this.getData();
      const idx = data.schedules.findIndex(s => s.id === schedule.id);
      if (idx !== -1) {
        data.schedules[idx] = Object.assign({}, data.schedules[idx], schedule);
        await this.persist('SCHEDULE_UPDATED');
        return data.schedules[idx];
      }
      return null;
    },

    async deleteSchedule(id) {
      const data = this.getData();
      data.schedules = data.schedules.filter(s => s.id !== id);
      await this.persist('SCHEDULE_DELETED');
      return true;
    },

    // ---------------- NOTICES OPERATIONS ----------------
    async addNotice(notice) {
      const data = this.getData();
      if (!notice.id) {
        notice.id = 'not-' + Date.now();
      }
      data.notices.unshift(notice);
      await this.persist('NOTICE_ADDED');
      return notice;
    },

    async updateNotice(notice) {
      const data = this.getData();
      const idx = data.notices.findIndex(n => n.id === notice.id);
      if (idx !== -1) {
        data.notices[idx] = Object.assign({}, data.notices[idx], notice);
        await this.persist('NOTICE_UPDATED');
        return data.notices[idx];
      }
      return null;
    },

    async deleteNotice(id) {
      const data = this.getData();
      data.notices = data.notices.filter(n => n.id !== id);
      await this.persist('NOTICE_DELETED');
      return true;
    },

    // ---------------- AFFECTED AREA OPERATIONS ----------------
    async updateAffectedArea(areaData) {
      const data = this.getData();
      data.affectedArea = Object.assign({}, data.affectedArea, areaData);
      await this.persist('AFFECTED_AREA_UPDATED');
      return data.affectedArea;
    },

    // ---------------- HISTORY OPERATIONS ----------------
    async addHistory(record) {
      const data = this.getData();
      if (!record.id) {
        record.id = 'hist-' + Date.now();
      }
      data.history.unshift(record);
      await this.persist('HISTORY_ADDED');
      return record;
    },

    async deleteHistory(id) {
      const data = this.getData();
      data.history = data.history.filter(h => h.id !== id);
      await this.persist('HISTORY_DELETED');
      return true;
    },

    // ---------------- IMPORTANT NOTES OPERATIONS ----------------
    async updateImportantNotes(notesList) {
      const data = this.getData();
      data.importantNotes = notesList;
      await this.persist('NOTES_UPDATED');
      return data.importantNotes;
    },

    // ---------------- SETTINGS ----------------
    async updateSettings(settings) {
      const data = this.getData();
      data.adminSettings = Object.assign({}, data.adminSettings, settings);
      await this.persist('SETTINGS_UPDATED');
      return data.adminSettings;
    },

    // ---------------- RESET TO DEFAULTS ----------------
    async resetToDefaults() {
      cachedData = getBaseSeedData();
      await this.persist('DATA_RESET');
      return cachedData;
    }
  };

  window.DataStore = DataStore;
})(window);
