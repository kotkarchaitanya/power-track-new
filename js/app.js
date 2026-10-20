// ==========================================================================
// ⚡ POWERTRACK - Main Application Controller
// Responsive, real-time electricity information and management system
// ==========================================================================

(function (window, document) {
  'use strict';

  // State
  let currentView = 'landing'; // 'landing' | 'user' | 'admin-login' | 'admin'
  let currentUserSubpage = 'home'; // 'home' | 'schedule' | 'history' | 'notices'
  let currentAdminTab = 'overview';
  let userMap = null;
  let adminMap = null;
  let userMapMarker = null;
  let userMapCircle = null;
  let adminMapMarker = null;
  let clockInterval = null;
  let countdownInterval = null;
  let editingScheduleId = null;
  let editingNoticeId = null;

  // Cache DOM Elements
  const DOM = {};

  function initDOM() {
    DOM.landingView = document.getElementById('landing-view');
    DOM.userView = document.getElementById('user-view');
    DOM.adminLoginView = document.getElementById('admin-login-view');
    DOM.adminView = document.getElementById('admin-view');

    // Navigation
    DOM.userNavLinks = document.querySelectorAll('.user-nav-link');
    DOM.userSubpages = document.querySelectorAll('.user-subpage');
    DOM.adminNavItems = document.querySelectorAll('.admin-nav-item');
    DOM.adminTabPanes = document.querySelectorAll('.admin-tab-pane');
    DOM.hamburgerBtn = document.getElementById('hamburger-btn');
    DOM.mobileNavDrawer = document.getElementById('mobile-nav-drawer');

    // Header elements
    DOM.headerStatusPill = document.getElementById('header-status-pill');
    DOM.headerStatusText = document.getElementById('header-status-text');
    DOM.headerLiveClock = document.getElementById('header-live-clock');

    // Live Clock (Home)
    DOM.digitalTime = document.getElementById('digital-time');
    DOM.digitalDay = document.getElementById('digital-day');
    DOM.digitalDate = document.getElementById('digital-date');

    // Hero Status (Home)
    DOM.heroStatusHeadline = document.getElementById('hero-status-headline');
    DOM.heroStatusDesc = document.getElementById('hero-status-desc');
    DOM.heroStatusIcon = document.getElementById('hero-status-icon');
    DOM.heroStatusUpdated = document.getElementById('hero-status-updated');

    // Emergency Banner
    DOM.emergencyBanner = document.getElementById('emergency-banner');
    DOM.emergencyArea = document.getElementById('emergency-area');
    DOM.emergencyReason = document.getElementById('emergency-reason');
    DOM.emergencyRestoration = document.getElementById('emergency-restoration');
    DOM.emergencyStartTime = document.getElementById('emergency-start-time');

    // Metric Cards (Home)
    DOM.nextCutTime = document.getElementById('next-cut-time');
    DOM.nextCutDuration = document.getElementById('next-cut-duration');
    DOM.nextCutRestoration = document.getElementById('next-cut-restoration');
    DOM.nextRestorationTime = document.getElementById('next-restoration-time');
    DOM.restorationCountdown = document.getElementById('restoration-countdown');

    // Timetable & Affected Area
    DOM.todayTimetableBody = document.getElementById('today-timetable-body');
    DOM.affectedAreaName = document.getElementById('affected-area-name');
    DOM.affectedAreaStatus = document.getElementById('affected-area-status');
    DOM.affectedAreaReason = document.getElementById('affected-area-reason');
    DOM.affectedAreaRestoration = document.getElementById('affected-area-restoration');
    DOM.homeNotesList = document.getElementById('home-notes-list');

    // Schedule View
    DOM.scheduleDateInput = document.getElementById('schedule-date-input');
    DOM.fullScheduleTableBody = document.getElementById('full-schedule-table-body');
    DOM.scheduleTotalAvailable = document.getElementById('schedule-total-available');
    DOM.scheduleTotalCuts = document.getElementById('schedule-total-cuts');
    DOM.scheduleSlotsCount = document.getElementById('schedule-slots-count');

    // History View
    DOM.historyTableBody = document.getElementById('history-table-body');
    DOM.historyTypeFilter = document.getElementById('history-type-filter');
    DOM.historySearchInput = document.getElementById('history-search-input');

    // Notices View
    DOM.noticesGrid = document.getElementById('notices-grid');
    DOM.noticePriorityFilter = document.getElementById('notice-priority-filter');

    // Admin Dashboard Elements
    DOM.adminKpiStatus = document.getElementById('admin-kpi-status');
    DOM.adminKpiCuts = document.getElementById('admin-kpi-cuts');
    DOM.adminKpiRestoration = document.getElementById('admin-kpi-restoration');
    DOM.adminKpiNotices = document.getElementById('admin-kpi-notices');
    DOM.adminQuickStatusSelect = document.getElementById('admin-quick-status-select');
    DOM.adminOverviewTimetable = document.getElementById('admin-overview-timetable');
    DOM.adminScheduleTableBody = document.getElementById('admin-schedule-table-body');
    DOM.adminNoticesTableBody = document.getElementById('admin-notices-table-body');
    DOM.adminHistoryTableBody = document.getElementById('admin-history-table-body');
    DOM.adminNotesList = document.getElementById('admin-notes-list');

    // Modals
    DOM.scheduleModal = document.getElementById('schedule-modal');
    DOM.noticeModal = document.getElementById('notice-modal');
    DOM.historyModal = document.getElementById('history-modal');
    DOM.toastContainer = document.getElementById('toast-container');
  }

  // ---------------- ROUTING & SCREEN NAVIGATION ----------------
  // Supported views: 'landing' | 'user' | 'admin-login' | 'admin'
  // Supported subpages for 'user': 'home' | 'schedule' | 'history' | 'notices'

  function resolveRouteString(str) {
    if (!str || str === '' || str === 'landing' || str === 'index.html' || str === '#') {
      return { view: 'landing', subpage: 'home' };
    }
    if (str === 'user' || str === 'home') {
      return { view: 'user', subpage: 'home' };
    }
    if (str === 'schedule') {
      return { view: 'user', subpage: 'schedule' };
    }
    if (str === 'history') {
      return { view: 'user', subpage: 'history' };
    }
    if (str === 'notices') {
      return { view: 'user', subpage: 'notices' };
    }
    if (str === 'login' || str === 'admin-login' || str === 'admin/login') {
      return { view: 'admin-login', subpage: 'home' };
    }
    if (str === 'admin' || str === 'admin/dashboard') {
      return { view: 'admin', subpage: 'home' };
    }
    return { view: 'landing', subpage: 'home' };
  }

  function parseCurrentRoute() {
    // 1. Check hash first: e.g. #/user, #/login, #/admin, #/schedule
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    if (rawHash) {
      return resolveRouteString(rawHash);
    }

    // 2. Otherwise check pathname: e.g. /user, /login, /admin
    let path = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').trim().toLowerCase();
    path = path.replace(/index\.html\/?$/, '').replace(/\/+$/, '');
    return resolveRouteString(path);
  }

  function getUrlForRoute(view, subpage) {
    if (view === 'landing') return { path: '/', hash: '#/' };
    if (view === 'user') {
      const sub = subpage || currentUserSubpage || 'home';
      return sub === 'home' 
        ? { path: '/user', hash: '#/user' } 
        : { path: `/${sub}`, hash: `#/${sub}` };
    }
    if (view === 'admin-login') return { path: '/login', hash: '#/login' };
    if (view === 'admin') return { path: '/admin', hash: '#/admin' };
    return { path: '/', hash: '#/' };
  }

  function navigateTo(viewId, subpage = null, updateHistory = true) {
    if (viewId === 'admin' && !DataStore.isAuthenticated()) {
      showToast('Please login to access the Admin Dashboard', 'error');
      navigateTo('admin-login', null, updateHistory);
      return;
    }

    if (updateHistory) {
      const target = getUrlForRoute(viewId, subpage);
      try {
        if (window.location.protocol.startsWith('http')) {
          window.history.pushState({ view: viewId, subpage }, '', target.path);
        } else {
          window.location.hash = target.hash;
        }
      } catch (err) {
        window.location.hash = target.hash;
      }
    }

    applyView(viewId, subpage);
  }

  function applyView(viewId, subpage = null) {
    currentView = viewId;

    [DOM.landingView, DOM.userView, DOM.adminLoginView, DOM.adminView].forEach(v => {
      if (v) v.classList.remove('active');
    });

    if (viewId === 'landing') {
      if (DOM.landingView) DOM.landingView.classList.add('active');
      window.scrollTo(0, 0);
    } else if (viewId === 'user') {
      if (DOM.userView) DOM.userView.classList.add('active');
      const targetSub = subpage || currentUserSubpage || 'home';
      showUserSubpage(targetSub, false);
      renderUserViews();
      setTimeout(initUserMap, 150);
      window.scrollTo(0, 0);
    } else if (viewId === 'admin-login') {
      if (DOM.adminLoginView) DOM.adminLoginView.classList.add('active');
      window.scrollTo(0, 0);
    } else if (viewId === 'admin') {
      if (!DataStore.isAuthenticated()) {
        showToast('Please login to access the Admin Dashboard', 'error');
        navigateTo('admin-login', null, true);
        return;
      }
      if (DOM.adminView) DOM.adminView.classList.add('active');
      updateAdminUserProfile();
      renderAdminDashboard();
      setTimeout(initAdminMap, 150);
      window.scrollTo(0, 0);
    }
  }

  function showView(viewId) {
    navigateTo(viewId, null, true);
  }

  function showUserSubpage(pageId, updateHistory = true) {
    currentUserSubpage = pageId;
    DOM.userSubpages.forEach(p => p.classList.remove('active'));
    DOM.userNavLinks.forEach(l => {
      if (l.dataset.page === pageId) l.classList.add('active');
      else l.classList.remove('active');
    });

    const target = document.getElementById(`subpage-${pageId}`);
    if (target) {
      target.classList.add('active');
    }

    if (DOM.mobileNavDrawer) {
      DOM.mobileNavDrawer.classList.remove('active');
    }

    if (updateHistory && currentView === 'user') {
      const target = getUrlForRoute('user', pageId);
      try {
        if (window.location.protocol.startsWith('http')) {
          window.history.pushState({ view: 'user', subpage: pageId }, '', target.path);
        } else {
          window.location.hash = target.hash;
        }
      } catch (e) {
        window.location.hash = target.hash;
      }
    }

    if (pageId === 'home') {
      setTimeout(() => {
        if (userMap) userMap.invalidateSize();
      }, 100);
    } else if (pageId === 'schedule') {
      renderScheduleView();
    } else if (pageId === 'history') {
      renderHistoryView();
    } else if (pageId === 'notices') {
      renderNoticesView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showAdminTab(tabId) {
    currentAdminTab = tabId;
    DOM.adminTabPanes.forEach(t => t.classList.remove('active'));
    DOM.adminNavItems.forEach(n => {
      if (n.dataset.tab === tabId) n.classList.add('active');
      else n.classList.remove('active');
    });

    const target = document.getElementById(`admin-tab-${tabId}`);
    if (target) target.classList.add('active');

    if (tabId === 'approvals') {
      renderAdminApprovalsTab();
    }

    if (tabId === 'affected-area') {
      setTimeout(() => {
        initAdminMap();
        if (adminMap) adminMap.invalidateSize();
      }, 150);
    }
  }

  // ---------------- LIVE DIGITAL CLOCK ----------------
  function startLiveClock() {
    function updateClock() {
      const now = new Date();
      
      // Time string: 07:35:42 PM
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const formattedHours = String(hours).padStart(2, '0');
      const timeStr = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

      // Day & Date string
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const dayStr = days[now.getDay()];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

      if (DOM.digitalTime) DOM.digitalTime.textContent = timeStr;
      if (DOM.digitalDay) DOM.digitalDay.textContent = dayStr;
      if (DOM.digitalDate) DOM.digitalDate.textContent = dateStr;
      if (DOM.headerLiveClock) DOM.headerLiveClock.textContent = timeStr;
    }

    updateClock();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateClock, 1000);
  }

  // ---------------- RESTORATION COUNTDOWN TIMER ----------------
  function startRestorationCountdown() {
    function updateCountdown() {
      const data = DataStore.getData();
      const status = data.systemStatus;

      // Calculate target timestamp
      let targetTime = null;
      if (status.targetRestorationCountdown) {
        targetTime = new Date(status.targetRestorationCountdown).getTime();
      }

      if (!targetTime || isNaN(targetTime)) {
        // Fallback target: try parsing nextRestorationTime today
        if (status.nextRestorationTime) {
          const match = status.nextRestorationTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const isPM = match[3].toUpperCase() === 'PM';
            if (isPM && h !== 12) h += 12;
            if (!isPM && h === 12) h = 0;
            const now = new Date();
            const tentative = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
            targetTime = tentative > now.getTime() ? tentative : tentative + 86400000;
          }
        }
      }

      if (!DOM.restorationCountdown) return;

      if (!targetTime) {
        DOM.restorationCountdown.textContent = '--:--:--';
        return;
      }

      const diff = targetTime - Date.now();

      if (diff <= 0) {
        DOM.restorationCountdown.textContent = '00:00:00 (Due Now)';
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');

      DOM.restorationCountdown.textContent = `${hrs}:${mins}:${secs}`;
    }

    updateCountdown();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // ---------------- RENDER USER VIEWS ----------------
  function renderUserViews() {
    const data = DataStore.getData();
    const status = data.systemStatus;
    const unplanned = data.unplannedOutage;
    const area = data.affectedArea;

    // 1. Header status pill
    if (DOM.headerStatusPill) {
      DOM.headerStatusPill.className = 'status-pill';
      if (status.status === 'Available') {
        DOM.headerStatusPill.classList.add('status-available');
        DOM.headerStatusText.textContent = 'Electricity Available';
      } else if (status.isUnplanned || status.status === 'Unavailable') {
        DOM.headerStatusPill.classList.add('status-cut');
        DOM.headerStatusText.textContent = status.isUnplanned ? 'Unplanned Power Cut' : 'Electricity Unavailable';
      } else {
        DOM.headerStatusPill.classList.add('status-warning');
        DOM.headerStatusText.textContent = 'Restoration in Progress';
      }
    }

    // 2. Hero Status Card
    if (DOM.heroStatusHeadline) {
      DOM.heroStatusHeadline.textContent = status.statusText || 'POWER AVAILABLE';
    }
    if (DOM.heroStatusDesc) {
      DOM.heroStatusDesc.textContent = status.description || 'Normal grid supply.';
    }
    if (DOM.heroStatusIcon) {
      DOM.heroStatusIcon.className = 'status-halo-icon';
      if (status.status === 'Available') {
        DOM.heroStatusIcon.classList.add('available');
        DOM.heroStatusIcon.innerHTML = '⚡';
      } else if (status.isUnplanned || status.status === 'Unavailable') {
        DOM.heroStatusIcon.classList.add('cut');
        DOM.heroStatusIcon.innerHTML = '⚠️';
      } else {
        DOM.heroStatusIcon.classList.add('warning');
        DOM.heroStatusIcon.innerHTML = '⏳';
      }
    }
    if (DOM.heroStatusUpdated) {
      const updateDate = status.lastUpdated ? new Date(status.lastUpdated) : new Date();
      DOM.heroStatusUpdated.textContent = `Last updated: ${updateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    // 3. Emergency Banner (Unplanned Outage)
    if (DOM.emergencyBanner) {
      if (unplanned && unplanned.active) {
        DOM.emergencyBanner.classList.add('active');
        if (DOM.emergencyArea) DOM.emergencyArea.textContent = unplanned.affectedArea;
        if (DOM.emergencyReason) DOM.emergencyReason.textContent = unplanned.reason;
        if (DOM.emergencyRestoration) DOM.emergencyRestoration.textContent = unplanned.expectedRestoration;
        if (DOM.emergencyStartTime) DOM.emergencyStartTime.textContent = unplanned.startTime;
      } else {
        DOM.emergencyBanner.classList.remove('active');
      }
    }

    // 4. Metric Cards (Home)
    if (DOM.nextCutTime) DOM.nextCutTime.textContent = status.nextCutTime || 'None Scheduled';
    if (DOM.nextCutDuration) DOM.nextCutDuration.textContent = `Expected Duration: ${status.nextCutDuration || 'N/A'}`;
    if (DOM.nextCutRestoration) DOM.nextCutRestoration.textContent = `Restoration: ${status.nextCutRestoration || 'N/A'}`;
    if (DOM.nextRestorationTime) DOM.nextRestorationTime.textContent = status.nextRestorationTime || 'N/A';

    // 5. Today's Timetable
    renderTodayTimetable();

    // 6. Affected Area details
    if (DOM.affectedAreaName) DOM.affectedAreaName.textContent = area.name;
    if (DOM.affectedAreaStatus) {
      DOM.affectedAreaStatus.textContent = area.status;
      DOM.affectedAreaStatus.className = 'info-val ' + (area.status.toLowerCase().includes('available') ? 'text-available' : 'text-cut');
    }
    if (DOM.affectedAreaReason) DOM.affectedAreaReason.textContent = area.reason || 'Normal Grid Supply';
    if (DOM.affectedAreaRestoration) DOM.affectedAreaRestoration.textContent = area.expectedRestoration || 'N/A';

    // 7. Important Notes
    if (DOM.homeNotesList) {
      DOM.homeNotesList.innerHTML = (data.importantNotes || []).map(note => `
        <div class="note-item">
          <div class="note-bullet-icon">⚡</div>
          <div class="note-text">${escapeHtml(note)}</div>
        </div>
      `).join('');
    }

    // Update map marker location if initialized
    updateMapLocation(area.latitude, area.longitude, area.name, area.status, area.radiusMeters);
  }

  // ---------------- TODAY'S TIMETABLE RENDERER ----------------
  function renderTodayTimetable() {
    if (!DOM.todayTimetableBody) return;
    const data = DataStore.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySlots = data.schedules.filter(s => s.date === todayStr);

    if (todaySlots.length === 0) {
      DOM.todayTimetableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            No scheduled interruptions registered for today. Normal supply active.
          </td>
        </tr>
      `;
      return;
    }

    DOM.todayTimetableBody.innerHTML = todaySlots.map(slot => {
      const isAvail = slot.status === 'Available';
      const isUnavail = slot.status === 'Unavailable';
      const statusClass = isAvail ? 'available' : (isUnavail ? 'unavailable' : 'warning');
      const statusIcon = isAvail ? '●' : (isUnavail ? '■' : '▲');

      return `
        <tr>
          <td><span class="time-range-badge">${escapeHtml(slot.startTime)} – ${escapeHtml(slot.endTime)}</span></td>
          <td>
            <span class="status-tag ${statusClass}">
              <span>${statusIcon}</span> ${escapeHtml(slot.status)}
            </span>
          </td>
          <td>${escapeHtml(slot.duration || '-')}</td>
          <td>${escapeHtml(slot.description || 'Electricity Available')}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------- SCHEDULE VIEW RENDERER ----------------
  function renderScheduleView() {
    const data = DataStore.getData();
    const selectedDate = DOM.scheduleDateInput && DOM.scheduleDateInput.value ?
      DOM.scheduleDateInput.value : new Date().toISOString().split('T')[0];

    const slots = data.schedules.filter(s => s.date === selectedDate);

    // Calculate metrics
    let availMinutes = 0;
    let cutMinutes = 0;

    slots.forEach(slot => {
      const dur = parseFloat(slot.duration) || 2;
      if (slot.status === 'Available') {
        availMinutes += dur * 60;
      } else {
        cutMinutes += dur * 60;
      }
    });

    if (DOM.scheduleTotalAvailable) DOM.scheduleTotalAvailable.textContent = `${(availMinutes / 60).toFixed(1)} hrs`;
    if (DOM.scheduleTotalCuts) DOM.scheduleTotalCuts.textContent = `${(cutMinutes / 60).toFixed(1)} hrs`;
    if (DOM.scheduleSlotsCount) DOM.scheduleSlotsCount.textContent = `${slots.length} Slots`;

    if (!DOM.fullScheduleTableBody) return;

    if (slots.length === 0) {
      DOM.fullScheduleTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
            No schedule slots recorded for ${selectedDate}. Full day standard power supply.
          </td>
        </tr>
      `;
      return;
    }

    DOM.fullScheduleTableBody.innerHTML = slots.map(slot => {
      const isAvail = slot.status === 'Available';
      const isUnavail = slot.status === 'Unavailable';
      const statusClass = isAvail ? 'available' : (isUnavail ? 'unavailable' : 'warning');

      return `
        <tr>
          <td><strong>${escapeHtml(slot.date)}</strong></td>
          <td><span class="time-range-badge">${escapeHtml(slot.startTime)} – ${escapeHtml(slot.endTime)}</span></td>
          <td><span class="status-tag ${statusClass}">${escapeHtml(slot.status)}</span></td>
          <td>${escapeHtml(slot.duration || '-')}</td>
          <td>${escapeHtml(slot.expectedRestoration || slot.endTime)}</td>
          <td>${escapeHtml(slot.description)}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------- HISTORY VIEW RENDERER ----------------
  function renderHistoryView() {
    if (!DOM.historyTableBody) return;
    const data = DataStore.getData();
    let historyList = [...(data.history || [])];

    const typeFilter = DOM.historyTypeFilter ? DOM.historyTypeFilter.value : 'all';
    const searchQuery = DOM.historySearchInput ? DOM.historySearchInput.value.toLowerCase().trim() : '';

    if (typeFilter !== 'all') {
      historyList = historyList.filter(h => h.type.toLowerCase().includes(typeFilter.toLowerCase()));
    }

    if (searchQuery) {
      historyList = historyList.filter(h =>
        h.area.toLowerCase().includes(searchQuery) ||
        h.date.toLowerCase().includes(searchQuery) ||
        h.type.toLowerCase().includes(searchQuery)
      );
    }

    if (historyList.length === 0) {
      DOM.historyTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
            No interruption records found matching your filters.
          </td>
        </tr>
      `;
      return;
    }

    DOM.historyTableBody.innerHTML = historyList.map(h => {
      let badgeClass = 'scheduled';
      const typeLow = h.type.toLowerCase();
      if (typeLow.includes('unplanned')) badgeClass = 'unplanned';
      else if (typeLow.includes('maintenance')) badgeClass = 'maintenance';
      else if (typeLow.includes('emergency')) badgeClass = 'emergency';

      return `
        <tr>
          <td><strong>${escapeHtml(h.date)}</strong></td>
          <td><span class="time-range-badge">${escapeHtml(h.startTime)}</span></td>
          <td><span class="time-range-badge">${escapeHtml(h.endTime)}</span></td>
          <td>${escapeHtml(h.duration)}</td>
          <td><span class="history-type-badge ${badgeClass}">${escapeHtml(h.type)}</span></td>
          <td>${escapeHtml(h.area)}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------- NOTICES VIEW RENDERER ----------------
  function renderNoticesView() {
    if (!DOM.noticesGrid) return;
    const data = DataStore.getData();
    let notices = [...(data.notices || [])];

    const priFilter = DOM.noticePriorityFilter ? DOM.noticePriorityFilter.value : 'all';
    if (priFilter !== 'all') {
      notices = notices.filter(n => n.priority.toLowerCase() === priFilter.toLowerCase());
    }

    if (notices.length === 0) {
      DOM.noticesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
          No notices currently posted for this category.
        </div>
      `;
      return;
    }

    DOM.noticesGrid.innerHTML = notices.map(n => {
      const pri = (n.priority || 'Normal').toLowerCase();
      return `
        <div class="notice-card priority-${pri}">
          <div class="notice-top-meta">
            <span class="notice-priority-pill ${pri}">${escapeHtml(n.priority)} Priority</span>
            <span class="notice-date-time">📅 ${escapeHtml(n.date)} at ${escapeHtml(n.time)}</span>
          </div>
          <h4 class="notice-title">${escapeHtml(n.title)}</h4>
          <p class="notice-desc">${escapeHtml(n.description)}</p>
        </div>
      `;
    }).join('');
  }

  // ---------------- MAP INTEGRATION (LEAFLET + GOOGLE MAPS) ----------------
  function initUserMap() {
    const mapEl = document.getElementById('affected-map');
    if (!mapEl) return;

    const data = DataStore.getData();
    const area = data.affectedArea || { latitude: 18.5204, longitude: 73.8567, zoom: 14, name: 'Local Village Feeder' };

    if (!userMap) {
      try {
        userMap = L.map('affected-map', {
          zoomControl: true,
          attributionControl: false
        }).setView([area.latitude, area.longitude], area.zoom || 14);

        // Modern Dark / Clean Tile Layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(userMap);

        // Pulsing custom marker
        const customIcon = L.divIcon({
          className: 'custom-pulse-marker',
          html: `<div style="
            width: 22px; height: 22px; border-radius: 50%;
            background: #ff3366; border: 3px solid #ffffff;
            box-shadow: 0 0 15px #ff3366;
            animation: pulseBolt 1.8s infinite;
          "></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        userMapMarker = L.marker([area.latitude, area.longitude], { icon: customIcon }).addTo(userMap);
        userMapMarker.bindPopup(`<strong>${escapeHtml(area.name)}</strong><br>Status: ${escapeHtml(area.status)}<br>Expected Restoration: ${escapeHtml(area.expectedRestoration)}`).openPopup();

        userMapCircle = L.circle([area.latitude, area.longitude], {
          color: '#ff3366',
          fillColor: '#ff3366',
          fillOpacity: 0.15,
          radius: area.radiusMeters || 1000
        }).addTo(userMap);

      } catch (e) {
        console.warn('Map initialization note:', e);
      }
    } else {
      userMap.invalidateSize();
      updateMapLocation(area.latitude, area.longitude, area.name, area.status, area.radiusMeters);
    }
  }

  function updateMapLocation(lat, lng, name, status, radius) {
    if (!userMap || !userMapMarker) return;
    const isAvail = status.toLowerCase().includes('available');
    const color = isAvail ? '#00e599' : '#ff3366';

    userMapMarker.setLatLng([lat, lng]);
    userMapMarker.setPopupContent(`<strong>${escapeHtml(name)}</strong><br>Status: ${escapeHtml(status)}`);
    
    if (userMapCircle) {
      userMapCircle.setLatLng([lat, lng]);
      userMapCircle.setStyle({ color: color, fillColor: color });
      if (radius) userMapCircle.setRadius(radius);
    }
  }

  function initAdminMap() {
    const mapEl = document.getElementById('admin-location-map');
    if (!mapEl) return;

    const data = DataStore.getData();
    const area = data.affectedArea || { latitude: 18.5204, longitude: 73.8567, zoom: 14 };

    if (!adminMap) {
      try {
        adminMap = L.map('admin-location-map', {
          zoomControl: true,
          attributionControl: false
        }).setView([area.latitude, area.longitude], area.zoom || 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(adminMap);

        adminMapMarker = L.marker([area.latitude, area.longitude], { draggable: true }).addTo(adminMap);
        adminMapMarker.bindPopup("Drag this marker to relocate affected area").openPopup();

        // Update inputs on drag
        adminMapMarker.on('dragend', function (e) {
          const latLng = e.target.getLatLng();
          const latInput = document.getElementById('admin-area-lat');
          const lngInput = document.getElementById('admin-area-lng');
          if (latInput) latInput.value = latLng.lat.toFixed(5);
          if (lngInput) lngInput.value = latLng.lng.toFixed(5);
        });

        // Click on map to move marker
        adminMap.on('click', function (e) {
          adminMapMarker.setLatLng(e.latlng);
          const latInput = document.getElementById('admin-area-lat');
          const lngInput = document.getElementById('admin-area-lng');
          if (latInput) latInput.value = e.latlng.lat.toFixed(5);
          if (lngInput) lngInput.value = e.latlng.lng.toFixed(5);
        });

      } catch (e) {
        console.warn('Admin map init note:', e);
      }
    } else {
      adminMap.invalidateSize();
      if (adminMapMarker) adminMapMarker.setLatLng([area.latitude, area.longitude]);
      adminMap.setView([area.latitude, area.longitude]);
    }
  }

  // ---------------- ADMIN DASHBOARD RENDERER ----------------
  function renderAdminDashboard() {
    const data = DataStore.getData();
    const status = data.systemStatus;
    const unplanned = data.unplannedOutage;
    const area = data.affectedArea;

    // 1. KPI Cards
    if (DOM.adminKpiStatus) DOM.adminKpiStatus.textContent = status.status;
    const todayStr = new Date().toISOString().split('T')[0];
    const cutsCount = data.schedules.filter(s => s.date === todayStr && s.status === 'Unavailable').length;
    if (DOM.adminKpiCuts) DOM.adminKpiCuts.textContent = cutsCount;
    if (DOM.adminKpiRestoration) DOM.adminKpiRestoration.textContent = status.nextRestorationTime || 'N/A';
    if (DOM.adminKpiNotices) DOM.adminKpiNotices.textContent = (data.notices || []).length;

    // 2. Quick Status Dropdown
    if (DOM.adminQuickStatusSelect) {
      DOM.adminQuickStatusSelect.value = status.status;
    }

    // 3. Overview Timetable
    if (DOM.adminOverviewTimetable) {
      const todaySlots = data.schedules.filter(s => s.date === todayStr);
      DOM.adminOverviewTimetable.innerHTML = todaySlots.map(s => `
        <tr>
          <td><span class="time-range-badge">${escapeHtml(s.startTime)} – ${escapeHtml(s.endTime)}</span></td>
          <td><span class="status-tag ${s.status === 'Available' ? 'available' : 'unavailable'}">${escapeHtml(s.status)}</span></td>
          <td>${escapeHtml(s.duration || '-')}</td>
          <td>${escapeHtml(s.description)}</td>
        </tr>
      `).join('');
    }

    // 4. Schedules Management Table
    renderAdminScheduleTable();

    // 5. Unplanned Outage Controls
    renderAdminUnplannedSection();

    // 6. Notices Management Table
    renderAdminNoticesTable();

    // 7. Affected Area Form Values
    if (document.getElementById('admin-area-name')) {
      document.getElementById('admin-area-name').value = area.name || '';
      document.getElementById('admin-area-village').value = area.village || '';
      document.getElementById('admin-area-status').value = area.status || 'Electricity Available';
      document.getElementById('admin-area-reason').value = area.reason || '';
      document.getElementById('admin-area-restoration').value = area.expectedRestoration || '';
      document.getElementById('admin-area-lat').value = area.latitude || 18.5204;
      document.getElementById('admin-area-lng').value = area.longitude || 73.8567;
      document.getElementById('admin-area-radius').value = area.radiusMeters || 1000;
    }

    // 8. History Management Table
    renderAdminHistoryTable();

    // 9. Notes Management List
    renderAdminNotesList();

    // 10. Pending Approvals Badge & Table
    const pendingCount = (data.adminRequests || []).filter(r => r.status === 'pending').length;
    const badgeCount = document.getElementById('badge-pending-count');
    if (badgeCount) {
      badgeCount.textContent = pendingCount;
      badgeCount.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
    if (currentAdminTab === 'approvals') {
      renderAdminApprovalsTab();
    }
  }

  function renderAdminScheduleTable() {
    if (!DOM.adminScheduleTableBody) return;
    const data = DataStore.getData();
    DOM.adminScheduleTableBody.innerHTML = data.schedules.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.date)}</strong></td>
        <td><span class="time-range-badge">${escapeHtml(s.startTime)} – ${escapeHtml(s.endTime)}</span></td>
        <td><span class="status-tag ${s.status === 'Available' ? 'available' : 'unavailable'}">${escapeHtml(s.status)}</span></td>
        <td>${escapeHtml(s.duration || '-')}</td>
        <td>${escapeHtml(s.expectedRestoration || s.endTime)}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="PowerTrackApp.openEditScheduleModal('${s.id}')">✏️ Edit</button>
            <button class="btn-danger" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="PowerTrackApp.deleteSchedule('${s.id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderAdminUnplannedSection() {
    const data = DataStore.getData();
    const un = data.unplannedOutage;
    const badge = document.getElementById('unplanned-active-badge');
    if (badge) {
      if (un && un.active) {
        badge.innerHTML = '⚠️ UNPLANNED OUTAGE ACTIVE';
        badge.style.background = 'rgba(255, 51, 102, 0.2)';
        badge.style.color = '#ff3366';
        badge.style.border = '1px solid #ff3366';
      } else {
        badge.innerHTML = '● NO ACTIVE UNPLANNED OUTAGE';
        badge.style.background = 'rgba(0, 229, 153, 0.2)';
        badge.style.color = '#00e599';
        badge.style.border = '1px solid #00e599';
      }
    }

    const form = document.getElementById('unplanned-form');
    if (form && un) {
      const startTimeInput = document.getElementById('unplanned-start-time');
      const reasonInput = document.getElementById('unplanned-reason');
      const areaInput = document.getElementById('unplanned-area');
      const restoreInput = document.getElementById('unplanned-restoration');
      const infoInput = document.getElementById('unplanned-info');

      if (startTimeInput && !startTimeInput.value) startTimeInput.value = un.startTime || '04:15 PM';
      if (reasonInput && !reasonInput.value) reasonInput.value = un.reason || '11kV Feeder Cable Breakdown near North Substation';
      if (areaInput && !areaInput.value) areaInput.value = un.affectedArea || data.affectedArea.name;
      if (restoreInput && !restoreInput.value) restoreInput.value = un.expectedRestoration || '06:30 PM';
      if (infoInput && !infoInput.value) infoInput.value = un.additionalInfo || '';
    }
  }

  function renderAdminNoticesTable() {
    if (!DOM.adminNoticesTableBody) return;
    const data = DataStore.getData();
    DOM.adminNoticesTableBody.innerHTML = (data.notices || []).map(n => `
      <tr>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td><span class="notice-priority-pill ${(n.priority||'normal').toLowerCase()}">${escapeHtml(n.priority)}</span></td>
        <td>${escapeHtml(n.date)} at ${escapeHtml(n.time)}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="PowerTrackApp.openEditNoticeModal('${n.id}')">✏️ Edit</button>
            <button class="btn-danger" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="PowerTrackApp.deleteNotice('${n.id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderAdminHistoryTable() {
    if (!DOM.adminHistoryTableBody) return;
    const data = DataStore.getData();
    DOM.adminHistoryTableBody.innerHTML = (data.history || []).map(h => `
      <tr>
        <td><strong>${escapeHtml(h.date)}</strong></td>
        <td>${escapeHtml(h.startTime)} – ${escapeHtml(h.endTime)}</td>
        <td>${escapeHtml(h.duration)}</td>
        <td><span class="history-type-badge scheduled">${escapeHtml(h.type)}</span></td>
        <td>${escapeHtml(h.area)}</td>
        <td>
          <button class="btn-danger" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="PowerTrackApp.deleteHistory('${h.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  function renderAdminNotesList() {
    if (!DOM.adminNotesList) return;
    const data = DataStore.getData();
    DOM.adminNotesList.innerHTML = (data.importantNotes || []).map((note, idx) => `
      <div class="note-item" style="justify-content: space-between;">
        <div style="display:flex; gap:0.75rem; align-items:flex-start;">
          <span style="color:var(--accent-cyan); font-weight:700;">#${idx + 1}</span>
          <span class="note-text">${escapeHtml(note)}</span>
        </div>
        <button class="btn-danger" style="padding:0.3rem 0.6rem; font-size:0.75rem; flex-shrink:0;" onclick="PowerTrackApp.deleteNote(${idx})">🗑️ Delete</button>
      </div>
    `).join('');
  }

  // ---------------- MODAL CONTROLLERS & CRUD ----------------
  function openAddScheduleModal() {
    editingScheduleId = null;
    document.getElementById('modal-schedule-title').textContent = 'Add Electricity Schedule Slot';
    document.getElementById('modal-sch-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-sch-start').value = '09:00 AM';
    document.getElementById('modal-sch-end').value = '11:00 AM';
    document.getElementById('modal-sch-duration').value = '2 Hours';
    document.getElementById('modal-sch-status').value = 'Unavailable';
    document.getElementById('modal-sch-restoration').value = '11:00 AM';
    document.getElementById('modal-sch-desc').value = 'Scheduled Load Shedding';
    DOM.scheduleModal.classList.add('active');
  }

  function openEditScheduleModal(id) {
    const data = DataStore.getData();
    const item = data.schedules.find(s => s.id === id);
    if (!item) return;

    editingScheduleId = id;
    document.getElementById('modal-schedule-title').textContent = 'Edit Electricity Schedule Slot';
    document.getElementById('modal-sch-date').value = item.date;
    document.getElementById('modal-sch-start').value = item.startTime;
    document.getElementById('modal-sch-end').value = item.endTime;
    document.getElementById('modal-sch-duration').value = item.duration;
    document.getElementById('modal-sch-status').value = item.status;
    document.getElementById('modal-sch-restoration').value = item.expectedRestoration || item.endTime;
    document.getElementById('modal-sch-desc').value = item.description;
    DOM.scheduleModal.classList.add('active');
  }

  async function saveScheduleFromModal(e) {
    e.preventDefault();
    const scheduleData = {
      date: document.getElementById('modal-sch-date').value,
      startTime: document.getElementById('modal-sch-start').value,
      endTime: document.getElementById('modal-sch-end').value,
      duration: document.getElementById('modal-sch-duration').value,
      status: document.getElementById('modal-sch-status').value,
      expectedRestoration: document.getElementById('modal-sch-restoration').value,
      description: document.getElementById('modal-sch-desc').value
    };

    if (editingScheduleId) {
      scheduleData.id = editingScheduleId;
      await DataStore.updateSchedule(scheduleData);
      showToast('Schedule updated successfully', 'success');
    } else {
      await DataStore.addSchedule(scheduleData);
      showToast('New schedule slot added', 'success');
    }

    DOM.scheduleModal.classList.remove('active');
  }

  async function deleteSchedule(id) {
    if (confirm('Are you sure you want to delete this schedule slot?')) {
      await DataStore.deleteSchedule(id);
      showToast('Schedule slot deleted', 'info');
    }
  }

  // Notice CRUD
  function openAddNoticeModal() {
    editingNoticeId = null;
    document.getElementById('modal-notice-title').textContent = 'Post New Notice';
    document.getElementById('modal-not-title').value = '';
    document.getElementById('modal-not-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-not-time').value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-not-priority').value = 'Normal';
    document.getElementById('modal-not-desc').value = '';
    DOM.noticeModal.classList.add('active');
  }

  function openEditNoticeModal(id) {
    const data = DataStore.getData();
    const item = data.notices.find(n => n.id === id);
    if (!item) return;

    editingNoticeId = id;
    document.getElementById('modal-notice-title').textContent = 'Edit Notice';
    document.getElementById('modal-not-title').value = item.title;
    document.getElementById('modal-not-date').value = item.date;
    document.getElementById('modal-not-time').value = item.time;
    document.getElementById('modal-not-priority').value = item.priority;
    document.getElementById('modal-not-desc').value = item.description;
    DOM.noticeModal.classList.add('active');
  }

  async function saveNoticeFromModal(e) {
    e.preventDefault();
    const noticeData = {
      title: document.getElementById('modal-not-title').value,
      date: document.getElementById('modal-not-date').value,
      time: document.getElementById('modal-not-time').value,
      priority: document.getElementById('modal-not-priority').value,
      description: document.getElementById('modal-not-desc').value
    };

    if (editingNoticeId) {
      noticeData.id = editingNoticeId;
      await DataStore.updateNotice(noticeData);
      showToast('Notice updated successfully', 'success');
    } else {
      await DataStore.addNotice(noticeData);
      showToast('Notice published successfully', 'success');
    }

    DOM.noticeModal.classList.remove('active');
  }

  async function deleteNotice(id) {
    if (confirm('Are you sure you want to delete this notice?')) {
      await DataStore.deleteNotice(id);
      showToast('Notice deleted', 'info');
    }
  }

  // History CRUD
  function openAddHistoryModal() {
    document.getElementById('modal-hist-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-hist-start').value = '02:00 PM';
    document.getElementById('modal-hist-end').value = '04:00 PM';
    document.getElementById('modal-hist-duration').value = '2h 00m';
    document.getElementById('modal-hist-type').value = 'Scheduled Load Shedding';
    document.getElementById('modal-hist-area').value = 'Wadgaon North Feeder';
    DOM.historyModal.classList.add('active');
  }

  async function saveHistoryFromModal(e) {
    e.preventDefault();
    const histData = {
      date: document.getElementById('modal-hist-date').value,
      startTime: document.getElementById('modal-hist-start').value,
      endTime: document.getElementById('modal-hist-end').value,
      duration: document.getElementById('modal-hist-duration').value,
      type: document.getElementById('modal-hist-type').value,
      area: document.getElementById('modal-hist-area').value
    };

    await DataStore.addHistory(histData);
    showToast('Outage history record added', 'success');
    DOM.historyModal.classList.remove('active');
  }

  async function deleteHistory(id) {
    if (confirm('Delete this historical outage record?')) {
      await DataStore.deleteHistory(id);
      showToast('Outage record deleted', 'info');
    }
  }

  // Notes CRUD
  async function addNotePrompt() {
    const text = prompt('Enter new public guidance / important note:');
    if (text && text.trim()) {
      const data = DataStore.getData();
      data.importantNotes.push(text.trim());
      await DataStore.updateImportantNotes(data.importantNotes);
      showToast('Important note added', 'success');
    }
  }

  async function deleteNote(idx) {
    if (confirm('Remove this note?')) {
      const data = DataStore.getData();
      data.importantNotes.splice(idx, 1);
      await DataStore.updateImportantNotes(data.importantNotes);
      showToast('Note deleted', 'info');
    }
  }

  // ---------------- UNPLANNED OUTAGE BUTTON ACTIONS ----------------
  async function activateUnplannedOutageAction() {
    const startTime = document.getElementById('unplanned-start-time').value || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reason = document.getElementById('unplanned-reason').value || 'Unplanned High Voltage Line Tripping';
    const affectedArea = document.getElementById('unplanned-area').value || 'Local Village Sectors';
    const expectedRestoration = document.getElementById('unplanned-restoration').value || '06:00 PM';
    const additionalInfo = document.getElementById('unplanned-info').value || '';

    // Calculate a target countdown timestamp (e.g., 2 hours from now)
    const targetTimestamp = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    await DataStore.activateUnplannedOutage({
      startTime,
      reason,
      affectedArea,
      expectedRestoration,
      additionalInfo,
      targetTimestamp
    });

    showToast('🚨 UNPLANNED POWER CUT ACTIVATED! User views updated.', 'error');
  }

  async function markRestoredAction() {
    await DataStore.markUnplannedRestored();
    showToast('✅ Power marked as RESTORED! Status changed to POWER AVAILABLE.', 'success');
  }

  async function saveAffectedAreaAction(e) {
    if (e) e.preventDefault();
    const areaData = {
      name: document.getElementById('admin-area-name').value,
      village: document.getElementById('admin-area-village').value,
      status: document.getElementById('admin-area-status').value,
      reason: document.getElementById('admin-area-reason').value,
      expectedRestoration: document.getElementById('admin-area-restoration').value,
      latitude: parseFloat(document.getElementById('admin-area-lat').value) || 18.5204,
      longitude: parseFloat(document.getElementById('admin-area-lng').value) || 73.8567,
      radiusMeters: parseInt(document.getElementById('admin-area-radius').value, 10) || 1000
    };

    await DataStore.updateAffectedArea(areaData);
    showToast('Affected area details & map coordinates saved!', 'success');
  }

  // ---------------- EVENT LISTENERS & SETUP ----------------
  function setupEventListeners() {
    // Role selection buttons on landing page
    const btnUserRole = document.getElementById('btn-role-user');
    const btnAdminRole = document.getElementById('btn-role-admin');
    if (btnUserRole) btnUserRole.addEventListener('click', () => navigateTo('user', 'home'));
    if (btnAdminRole) btnAdminRole.addEventListener('click', () => navigateTo('admin-login'));

    // Switch Role / Back to Landing
    document.querySelectorAll('.btn-back-landing').forEach(btn => {
      btn.addEventListener('click', () => navigateTo('landing'));
    });

    // User Subpage navigation links
    DOM.userNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showUserSubpage(link.dataset.page, true);
      });
    });

    // Mobile Hamburger
    if (DOM.hamburgerBtn && DOM.mobileNavDrawer) {
      DOM.hamburgerBtn.addEventListener('click', () => {
        DOM.mobileNavDrawer.classList.toggle('active');
      });
    }

    // Admin Sidebar Tab links
    DOM.adminNavItems.forEach(item => {
      item.addEventListener('click', () => {
        showAdminTab(item.dataset.tab);
      });
    });

    // Google Sign-In Button
    const btnGoogle = document.getElementById('btn-google-login');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        btnGoogle.disabled = true;
        btnGoogle.classList.add('loading');
        const origHtml = btnGoogle.innerHTML;
        btnGoogle.innerHTML = `<span>Connecting to Google...</span>`;
        try {
          const res = await DataStore.loginWithGoogle();
          if (res.success) {
            showToast(`Welcome, ${res.user.displayName || 'Administrator'}!`, 'success');
            updateAdminUserProfile();
            navigateTo('admin');
          }
        } catch (err) {
          console.error("Google Login Error:", err);
          const msg = (err && err.code === 'auth/popup-closed-by-user')
            ? 'Sign-in window was closed.'
            : (err && err.message ? err.message : 'Google sign-in failed');
          showToast(msg, 'error');
        } finally {
          btnGoogle.disabled = false;
          btnGoogle.classList.remove('loading');
          btnGoogle.innerHTML = origHtml;
        }
      });
    }

    // Sign In vs Register Admin Tabs
    let isRegisterMode = false;
    const tabSignIn = document.getElementById('tab-btn-signin');
    const tabRegister = document.getElementById('tab-btn-register');
    const submitBtn = document.getElementById('btn-login-submit');
    const submitText = document.getElementById('login-submit-text');
    const emailLabel = document.getElementById('login-email-label');
    const groupName = document.getElementById('group-register-name');
    const groupDesig = document.getElementById('group-register-designation');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (tabSignIn && tabRegister) {
      tabSignIn.addEventListener('click', () => {
        isRegisterMode = false;
        tabSignIn.classList.add('active');
        tabRegister.classList.remove('active');
        if (groupName) groupName.style.display = 'none';
        if (groupDesig) groupDesig.style.display = 'none';
        if (submitText) submitText.textContent = 'Secure Sign In';
        if (emailLabel) emailLabel.textContent = 'Admin Email';
        if (usernameInput) usernameInput.placeholder = 'e.g. admin@powertrack.org';
        if (passwordInput) passwordInput.placeholder = 'Enter password';
      });

      tabRegister.addEventListener('click', () => {
        isRegisterMode = true;
        tabRegister.classList.add('active');
        tabSignIn.classList.remove('active');
        if (groupName) groupName.style.display = 'block';
        if (groupDesig) groupDesig.style.display = 'block';
        if (submitText) submitText.textContent = 'Submit Registration Request';
        if (emailLabel) emailLabel.textContent = 'Admin Email';
        if (usernameInput) usernameInput.placeholder = 'e.g. ramesh.patil@substation.gov.in';
        if (passwordInput) passwordInput.placeholder = 'Create admin password (min 6 characters)';
      });
    }

    // Admin Login / Register Form
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = (document.getElementById('login-username')?.value || '').trim();
        const pass = (document.getElementById('login-password')?.value || '').trim();

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('loading');
        }
        const origSubmitText = submitText ? submitText.textContent : (isRegisterMode ? 'Submitting...' : 'Signing In...');
        if (submitText) submitText.textContent = isRegisterMode ? 'Sending Request...' : 'Authenticating...';

        try {
          if (isRegisterMode) {
            const name = (document.getElementById('login-name')?.value || '').trim();
            const designation = (document.getElementById('login-designation')?.value || '').trim() || 'Substation Administrator';

            if (!name) {
              showToast('Please enter your Full Name', 'warning');
              return;
            }
            if (!user || !user.includes('@')) {
              showToast('Please enter a valid email address', 'warning');
              return;
            }
            if (!pass || pass.length < 6) {
              showToast('Password must be at least 6 characters long', 'warning');
              return;
            }

            const result = await DataStore.submitAdminRegistrationRequest({
              name,
              email: user,
              password: pass,
              designation
            });

            if (result && result.success) {
              showToast('Registration request submitted successfully.', 'success', 5000);
              openAdminRegModal(result);
              tabSignIn.click();
            } else {
              showToast((result && result.message) || 'Failed to submit registration request', 'error');
            }
          } else {
            // Sign in
            const result = await DataStore.login(user, pass);
            if (result && result.success) {
              const welcomeMsg = `Welcome back, ${result.user?.displayName || 'Administrator'}!`;
              showToast(welcomeMsg, 'success');
              if (result.note) {
                setTimeout(() => showToast(result.note, 'info'), 1200);
              }
              updateAdminUserProfile();
              navigateTo('admin');
            } else {
              showToast((result && result.message) || 'Authentication failed', 'error');
            }
          }
        } catch (err) {
          console.error("Auth error:", err);
          showToast(err.message || 'Authentication error occurred', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
          }
          if (submitText) submitText.textContent = origSubmitText;
        }
      });
    }

    // Admin Logout
    document.querySelectorAll('.btn-admin-logout').forEach(btn => {
      btn.addEventListener('click', async () => {
        await DataStore.logout();
        updateAdminUserProfile();
        showToast('Logged out successfully', 'info');
        navigateTo('landing');
      });
    });

    // Admin Quick Status Dropdown
    if (DOM.adminQuickStatusSelect) {
      DOM.adminQuickStatusSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        let text = 'POWER AVAILABLE';
        let desc = 'Grid power operational across all feeders.';
        if (val === 'Unavailable') {
          text = 'POWER CUT';
          desc = 'Scheduled load shedding or maintenance active.';
        } else if (val === 'Restoration in Progress') {
          text = 'RESTORATION IN PROGRESS';
          desc = 'Field crews concluding work; supply energizing soon.';
        }
        await DataStore.updateStatus(val, text, desc);
        showToast(`System status updated to: ${text}`, 'success');
      });
    }

    // Unplanned outage buttons
    const btnActivateUnplanned = document.getElementById('btn-activate-unplanned');
    const btnMarkRestored = document.getElementById('btn-mark-restored');
    if (btnActivateUnplanned) btnActivateUnplanned.addEventListener('click', activateUnplannedOutageAction);
    if (btnMarkRestored) btnMarkRestored.addEventListener('click', markRestoredAction);

    // Affected Area Form
    const affectedAreaForm = document.getElementById('affected-area-form');
    if (affectedAreaForm) affectedAreaForm.addEventListener('submit', saveAffectedAreaAction);

    // Schedule Filter by Date
    if (DOM.scheduleDateInput) {
      DOM.scheduleDateInput.addEventListener('change', renderScheduleView);
    }

    // History Filters
    if (DOM.historyTypeFilter) DOM.historyTypeFilter.addEventListener('change', renderHistoryView);
    if (DOM.historySearchInput) DOM.historySearchInput.addEventListener('input', renderHistoryView);

    // Notice Filter
    if (DOM.noticePriorityFilter) DOM.noticePriorityFilter.addEventListener('change', renderNoticesView);

    // Modal Form Submissions
    const formSchedule = document.getElementById('form-modal-schedule');
    if (formSchedule) formSchedule.addEventListener('submit', saveScheduleFromModal);

    const formNotice = document.getElementById('form-modal-notice');
    if (formNotice) formNotice.addEventListener('submit', saveNoticeFromModal);

    const formHistory = document.getElementById('form-modal-history');
    if (formHistory) formHistory.addEventListener('submit', saveHistoryFromModal);

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Browser navigation history (Back / Forward buttons)
    window.addEventListener('popstate', () => {
      const route = parseCurrentRoute();
      applyView(route.view, route.subpage);
    });

    window.addEventListener('hashchange', () => {
      const route = parseCurrentRoute();
      applyView(route.view, route.subpage);
    });

    // DataStore Change Listener for Real-Time UI Synchronization
    DataStore.on('change', () => {
      if (currentView === 'user') {
        renderUserViews();
        if (currentUserSubpage === 'schedule') renderScheduleView();
        if (currentUserSubpage === 'history') renderHistoryView();
        if (currentUserSubpage === 'notices') renderNoticesView();
      } else if (currentView === 'admin') {
        renderAdminDashboard();
      }
    });

    // Firebase Realtime Sync Status listener
    DataStore.on('syncStatus', (status) => {
      const userBadge = document.getElementById('user-cloud-badge');
      const adminBadge = document.getElementById('admin-cloud-badge');
      const isOk = status && status.connected;
      const label = isOk ? 'Cloud Live' : 'Offline Mode';
      const tooltip = isOk
        ? 'Connected to Firebase Realtime Database (Live cloud updates active)'
        : 'Firebase offline / Local fallback storage';

      [userBadge, adminBadge].forEach(badge => {
        if (!badge) return;
        badge.title = tooltip;
        const textSpan = badge.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = label;
        if (!isOk) {
          badge.style.background = 'rgba(239, 68, 68, 0.15)';
          badge.style.color = '#ef4444';
          badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          const dot = badge.querySelector('.firebase-sync-dot');
          if (dot) {
            dot.style.background = '#ef4444';
            dot.style.boxShadow = '0 0 8px #ef4444';
          }
        } else {
          badge.style.background = '';
          badge.style.color = '';
          badge.style.borderColor = '';
          const dot = badge.querySelector('.firebase-sync-dot');
          if (dot) {
            dot.style.background = '';
            dot.style.boxShadow = '';
          }
        }
      });
    });

    // Auth State Listener
    DataStore.on('authChange', (user) => {
      updateAdminUserProfile();
    });

    // Admin Requests Change Listener
    DataStore.on('adminRequestsChange', () => {
      const data = DataStore.getData();
      const pendingCount = (data.adminRequests || []).filter(r => r.status === 'pending').length;
      const badgeCount = document.getElementById('badge-pending-count');
      if (badgeCount) {
        badgeCount.textContent = pendingCount;
        badgeCount.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }
      if (currentAdminTab === 'approvals') {
        renderAdminApprovalsTab();
      }
    });
  }

  function updateAdminUserProfile() {
    const user = DataStore.getCurrentUser();
    const profileBox = document.getElementById('admin-user-profile');
    const avatarImg = document.getElementById('admin-user-avatar');
    const nameSpan = document.getElementById('admin-user-name');
    const emailSpan = document.getElementById('admin-user-email');

    if (user && profileBox && avatarImg && nameSpan && emailSpan) {
      nameSpan.textContent = user.displayName || 'Administrator';
      emailSpan.textContent = user.email || 'admin@powertrack.local';
      if (user.photoURL) {
        avatarImg.src = user.photoURL;
      } else {
        avatarImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'Admin') + '&background=0ea5e9&color=fff';
      }
      profileBox.style.display = 'flex';
    } else if (profileBox) {
      profileBox.style.display = 'none';
    }
  }

  // ---------------- HELPERS ----------------
  function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------- ADMIN REGISTRATION MODAL & WORKFLOW ----------------
  function openAdminRegModal(res) {
    const modal = document.getElementById('admin-reg-modal');
    const body = document.getElementById('modal-admin-reg-body');
    if (!modal || !body) return;

    const req = res.request || {};
    body.innerHTML = `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <div style="font-size:3rem; margin-bottom:0.5rem;">⚡ 📋</div>
        <h4 style="font-size:1.35rem; color:var(--accent-cyan); font-weight:800; margin-bottom:0.5rem;">
          Registration Request Submitted
        </h4>
        <p style="color:var(--text-secondary); font-size:0.92rem; line-height:1.5; margin:0 auto; max-width:440px;">
          Your administrator access request has been submitted successfully for verification. You will be able to sign in once your account is reviewed and approved.
        </p>
      </div>

      <div style="background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:12px; padding:1.15rem; margin-bottom:1.25rem;">
        <div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-size:0.9rem; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:var(--text-muted);">Applicant Name:</span>
          <strong>${escapeHtml(req.name || '')}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-size:0.9rem; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:var(--text-muted);">Admin Email:</span>
          <strong style="color:var(--accent-cyan); font-family:'JetBrains Mono', monospace;">${escapeHtml(req.email || '')}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-size:0.9rem; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:var(--text-muted);">Role / Department:</span>
          <strong>${escapeHtml(req.designation || 'Administrator')}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-size:0.9rem;">
          <span style="color:var(--text-muted);">Status:</span>
          <span class="badge" style="background:rgba(234,179,8,0.2); color:#eab308; border:1px solid #eab308; padding:0.15rem 0.6rem; border-radius:4px; font-weight:700; font-size:0.75rem;">
            ⏳ PENDING APPROVAL
          </span>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  function closeAdminRegModal() {
    const modal = document.getElementById('admin-reg-modal');
    if (modal) modal.classList.remove('active');
  }

  // ---------------- URL ADMIN ACTION HANDLER (?action=approve_admin) ----------------
  async function checkUrlAdminAction() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const reqId = params.get('reqId');
      const token = params.get('token');

      if (action && reqId && (action === 'approve_admin' || action === 'approve' || action === 'decline_admin' || action === 'decline')) {
        const isApprove = (action === 'approve' || action === 'approve_admin');
        const res = await DataStore.processAdminRequestAction(reqId, action, token);
        if (res && res.success) {
          const req = res.request;
          const name = req ? req.name : 'Administrator';
          const email = req ? req.email : '';
          if (isApprove) {
            showToast(`✅ Admin Registration Approved! ${name} (${email}) is now an authorized administrator.`, 'success', 7000);
          } else {
            showToast(`❌ Admin Request Declined: Access declined for ${name} (${email}).`, 'error', 7000);
          }
        } else {
          showToast((res && res.message) || 'Could not process admin action from URL', 'warning');
        }

        // Clean up query string
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn("URL admin action error:", e);
    }
  }

  // ---------------- ADMIN APPROVALS PANEL RENDERER ----------------
  function renderAdminApprovalsTab() {
    const data = DataStore.getData();
    const requests = Array.isArray(data.adminRequests) ? data.adminRequests : [];
    const authorized = Array.isArray(data.authorizedAdmins) ? data.authorizedAdmins : ['kotkarchaitanya18@gmail.com'];

    const pending = requests.filter(r => r.status === 'pending');

    // Update KPI numbers
    const kpiPending = document.getElementById('kpi-pending-reqs');
    if (kpiPending) kpiPending.textContent = pending.length;

    const kpiAuth = document.getElementById('kpi-authorized-admins');
    if (kpiAuth) kpiAuth.textContent = authorized.length;

    const badgeTable = document.getElementById('badge-pending-table-count');
    if (badgeTable) badgeTable.textContent = pending.length;

    const badgeSidebar = document.getElementById('badge-pending-count');
    if (badgeSidebar) {
      badgeSidebar.textContent = pending.length;
      badgeSidebar.style.display = pending.length > 0 ? 'inline-block' : 'none';
    }

    // 1. Pending Requests Table
    const tbodyPending = document.getElementById('table-pending-requests');
    if (tbodyPending) {
      if (pending.length === 0) {
        tbodyPending.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">✅ No pending registration requests. All clear!</td></tr>`;
      } else {
        tbodyPending.innerHTML = pending.map(r => `
          <tr>
            <td><strong>${escapeHtml(r.name || 'New Admin')}</strong></td>
            <td><code style="color:var(--accent-cyan); font-weight:700;">${escapeHtml(r.email)}</code></td>
            <td>${escapeHtml(r.designation || 'Administrator')}</td>
            <td><small style="color:var(--text-muted);">${new Date(r.requestedAt || Date.now()).toLocaleString()}</small></td>
            <td>
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                <button class="btn-primary" style="padding:0.35rem 0.75rem; font-size:0.8rem; background:#10b981; border-color:#10b981;" onclick="PowerTrackApp.approveRequest('${r.id}')">
                  ⚡ Accept &amp; Register
                </button>
                <button class="btn-danger" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="PowerTrackApp.declineRequest('${r.id}')">
                  ❌ Decline
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 2. Authorized Admins Table
    const tbodyAuth = document.getElementById('table-authorized-admins');
    if (tbodyAuth) {
      tbodyAuth.innerHTML = authorized.map(a => {
        const email = (typeof a === 'string' ? a : (a && a.email)) || '';
        const cleanEmail = String(email).toLowerCase().trim();
        const isRoot = (cleanEmail === 'kotkarchaitanya18@gmail.com');
        const name = (typeof a === 'object' && a.name) ? a.name : (isRoot ? 'Chaitanya Kotkar' : cleanEmail.split('@')[0]);
        const role = (typeof a === 'object' && a.designation) ? a.designation : (isRoot ? 'Primary Super Administrator' : 'Authorized Administrator');

        return `
          <tr>
            <td><strong>${escapeHtml(name)}</strong></td>
            <td><code style="color:var(--accent-cyan);">${escapeHtml(cleanEmail)}</code></td>
            <td>${escapeHtml(role)}</td>
            <td>
              <span class="badge" style="background:${isRoot ? 'rgba(56,189,248,0.2)' : 'rgba(16,185,129,0.2)'}; color:${isRoot ? '#38bdf8' : '#10b981'}; border:1px solid ${isRoot ? '#38bdf8' : '#10b981'}; padding:0.2rem 0.55rem; border-radius:4px; font-size:0.75rem; font-weight:700;">
                ${isRoot ? '⭐ ROOT SUPER ADMIN' : '🟢 ACTIVE ADMINISTRATOR'}
              </span>
            </td>
            <td>
              ${isRoot ? '<span style="color:var(--text-muted); font-size:0.8rem;">Permanent Authority</span>' : `
                <button class="btn-danger" style="padding:0.3rem 0.65rem; font-size:0.78rem;" onclick="PowerTrackApp.revokeAdmin('${escapeHtml(cleanEmail)}')">
                  🚫 Revoke Access
                </button>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }

    // 3. Request Audit History Table
    const tbodyHistory = document.getElementById('table-requests-history');
    if (tbodyHistory) {
      if (requests.length === 0) {
        tbodyHistory.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No request history logged yet.</td></tr>`;
      } else {
        tbodyHistory.innerHTML = requests.map(r => {
          let statusBadge = '';
          if (r.status === 'approved') {
            statusBadge = `<span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; border:1px solid #10b981;">APPROVED</span>`;
          } else if (r.status === 'declined') {
            statusBadge = `<span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444;">DECLINED</span>`;
          } else if (r.status === 'revoked') {
            statusBadge = `<span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444;">REVOKED</span>`;
          } else {
            statusBadge = `<span class="badge" style="background:rgba(234,179,8,0.2); color:#eab308; border:1px solid #eab308;">PENDING</span>`;
          }

          return `
            <tr>
              <td><strong>${escapeHtml(r.name || '')}</strong></td>
              <td><code>${escapeHtml(r.email || '')}</code></td>
              <td>${statusBadge}</td>
              <td><small>${new Date(r.requestedAt || Date.now()).toLocaleString()}</small></td>
              <td><small>${r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '—'}</small></td>
              <td><small style="color:var(--text-muted);">${escapeHtml(r.reviewer || 'Pending')}</small></td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  async function approveRequest(reqId) {
    if (!confirm('Authorize and register this applicant as an administrator?')) return;
    const res = await DataStore.approveAdminRequest(reqId);
    if (res.success) {
      showToast(`Admin request approved! ${res.request ? res.request.name : ''} is now registered.`, 'success');
      renderAdminApprovalsTab();
    } else {
      showToast(res.message || 'Failed to approve admin request', 'error');
    }
  }

  async function declineRequest(reqId) {
    if (!confirm('Decline this administrator registration request?')) return;
    const res = await DataStore.declineAdminRequest(reqId);
    if (res.success) {
      showToast('Admin request declined.', 'info');
      renderAdminApprovalsTab();
    } else {
      showToast(res.message || 'Failed to decline admin request', 'error');
    }
  }

  async function revokeAdmin(email) {
    if (!confirm(`Revoke administrator access for ${email}?`)) return;
    const res = await DataStore.revokeAdmin(email);
    if (res.success) {
      showToast(`Administrator access revoked for ${email}`, 'warning');
      renderAdminApprovalsTab();
    } else {
      showToast(res.message || 'Failed to revoke administrator access', 'error');
    }
  }

  // Public API exported to window
  window.PowerTrackApp = {
    async init() {
      initDOM();
      await DataStore.init();
      setupEventListeners();
      startLiveClock();
      startRestorationCountdown();

      // Check URL query parameters for admin action
      await checkUrlAdminAction();

      // Set today's date in schedule datepicker
      if (DOM.scheduleDateInput) {
        DOM.scheduleDateInput.value = new Date().toISOString().split('T')[0];
      }

      // Initial route restoration
      const initialRoute = parseCurrentRoute();
      applyView(initialRoute.view, initialRoute.subpage);
    },
    navigateTo,
    showView,
    showUserSubpage,
    showAdminTab,
    openAddScheduleModal,
    openEditScheduleModal,
    deleteSchedule,
    openAddNoticeModal,
    openEditNoticeModal,
    deleteNotice,
    openAddHistoryModal,
    deleteHistory,
    addNotePrompt,
    deleteNote,
    renderAdminApprovalsTab,
    approveRequest,
    declineRequest,
    revokeAdmin,
    openAdminRegModal,
    closeAdminRegModal,
    showToast,
    async resetDemoData() {
      if (confirm('Reset all electricity schedules and notices to default village demo state?')) {
        await DataStore.resetToDefaults();
        showToast('Demo data reset successfully', 'info');
      }
    }
  };

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', window.PowerTrackApp.init);
})(window, document);
