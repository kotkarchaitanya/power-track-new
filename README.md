# ⚡ PowerTrack - Electricity Load-Shedding & Restoration Information System

> **"Track Power. Stay Informed."**

PowerTrack is a modern, responsive electricity load-shedding and restoration information web application designed for villages and local communities. It provides citizens and local administrators with accurate, real-time data regarding electricity availability, planned load-shedding timetables, emergency power cuts, expected restoration countdowns, official notices, and interactive affected-area maps.

---

## 🚀 Key Features

### 1. Landing Page (Role Selection)
- **PowerTrack Branding**: Glowing lightning bolt identity with tagline *"Track Power. Stay Informed."*
- **Role Selection Cards**:
  - **USER**: *"View Electricity Information"* → Direct access to public citizen dashboard.
  - **ADMIN**: *"Manage Power Information"* → Secure access to the administrative control console.

### 2. User Section (Public Citizen Portal)
- **Dynamic Header**:
  - Real-time status badge with color coding:
    - 🟢 **Green**: Electricity Available
    - 🔴 **Red**: Electricity Unavailable / Outage
    - 🟡 **Orange**: Power Cut / Restoration Pending
  - Live Digital Clock synchronized with local time.
  - Quick role switch navigation.
- **Home Dashboard**:
  - **A. Current Power Status Hero Card**: Displays current status (`POWER AVAILABLE`, `POWER CUT`, `RESTORATION IN PROGRESS`, `UNPLANNED POWER CUT`), detailed feeder state, and last updated timestamp.
  - **B. Emergency Outage Banner**: Activates automatically whenever an unplanned outage is triggered by the substation.
  - **C. Live Digital Clock**: Prominent digital clock updating every second with Time (HH:MM:SS AM/PM), Day, and Date.
  - **D. Next Power Cut & Expected Restoration Cards**:
    - Start time, expected duration, and restoration time.
    - **Live countdown timer** (`HH:MM:SS`) ticking down to the exact restoration target.
  - **E. Today's Complete Timetable**: Clean table with columns `| Time | Status | Duration | Description |`.
  - **F. Affected Area & Interactive Map**:
    - Area name, feeder zone, current status, reason for outage, and restoration target.
    - Interactive map showing the affected area with radar pulse marker and coverage radius circle (powered by Leaflet OpenStreetMap with optional Google Maps API configuration).
  - **G. Important Notes**: Safety instructions, appliance surge advisories, and emergency helpline (1800-233-3435).
- **Schedule Section**:
  - Date selector with quick filters ("Today", "Tomorrow", custom date picker).
  - Summary metrics: total available hours, total load-shedding hours, and total slots count.
  - Complete date-wise timetable.
- **History Section**:
  - Searchable and filterable archive of past outages.
  - Filter by type: *Scheduled Load Shedding*, *Unplanned Power Cut*, *Maintenance*, *Emergency Outage*.
  - Search by area name, date, or cause.
- **Notices Section**:
  - Official electricity bulletins and announcements.
  - Priority indicator tags: **High (Red)**, **Medium (Orange)**, **Normal (Green/Blue)**.

### 3. Admin Section (Control Console)
- **Secure Authentication**:
  - Username and password verification.
  - **Default Credentials**: Username: `admin` | Password: `admin123`.
- **7.1 Dashboard Overview**:
  - Real-time KPI summary cards (Current Power Status, Today's Load Shedding Slots, Next Target Restoration, Active Notices count).
  - Header Quick Status Switcher (1-click status update).
- **7.2 Schedule Management**:
  - Add new electricity schedule slots.
  - Edit existing slots (Date, Start Time, End Time, Status, Duration, Description, Restoration Time).
  - Delete slots.
  - Immediate reflection across citizen views.
- **7.3 Unplanned Power Cut Command Center**:
  - Dedicated emergency outage control.
  - Form fields: Start time, Affected Area, Reason, Expected Restoration, Technical Crew Info.
  - **"Activate Emergency Power Cut"**: Immediately shifts status to `UNPLANNED POWER CUT`, flashes emergency banner, sets countdown timer, and logs to history.
  - **"Mark as Restored"**: Instantly restores power to `POWER AVAILABLE`, clears alerts, and marks history record as resolved.
- **7.4 Add / Manage Notices**:
  - Create, edit, and delete official public bulletins with Priority levels (High, Medium, Normal).
- **7.5 Affected Area & Map Update**:
  - Update affected zone name, village sector, supply status, reason, and restoration time.
  - **Interactive Map Location Picker**: Click or drag the marker to update geographic latitude/longitude and radius.
- **7.6 History & Notes Management**:
  - Add historical outage records or remove archived entries.
  - Manage public guidelines and safety notes.

---

## 🛠️ Architecture & Technologies

- **Frontend**: HTML5 semantic markup, modern CSS3 design system with custom properties, glassmorphism, responsive grid, dynamic micro-animations, and vanilla ES JavaScript.
- **Mapping**: Leaflet OpenStreetMap with custom dark-mode tile layer, pulsing radar marker, and support for Google Maps JavaScript API via admin settings.
- **Cloud Backend & Real-Time Sync**: **Firebase Realtime Database** (`asia-southeast1`) providing instant live cloud updates across all citizen and administrator screens with zero delay.
- **Authentication**: **Firebase Google Sign-In** (`firebase/auth`) popup authentication with avatar and profile display, plus local fallback authentication.
- **Local Server Fallback**: Native Windows PowerShell HTTP REST API server (`server.ps1`) using .NET `System.Net.HttpListener` (`data.json`).
- **Client Offline Storage**: Browser `localStorage` + `BroadcastChannel` for offline availability and cross-tab reactivity.

---

## 🏃 How to Run

### Option 1: Run via Node.js (macOS, Linux & Windows)
Run:
```bash
npm start
# or
node server.js
# or (macOS/Linux launcher)
./start.sh
```
Then navigate to [http://localhost:8085/](http://localhost:8085/) in any web browser.

### Option 2: 1-Click Batch Launcher (Windows)
Simply double-click:
```cmd
start.bat
```
This automatically starts the local web & REST API server and launches `http://localhost:8085/` in your default browser.

### Option 3: Run via PowerShell (Windows)
Open PowerShell in the project directory and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8085
```
Then navigate to [http://localhost:8085/](http://localhost:8085/) in any web browser.

### Option 3: Direct File Protocol
You can also open [index.html](file:///c:/Users/SANDIP%20KOTKAR/OneDrive/Desktop/Power%20track/index.html) directly in any modern browser.

---

## 🔑 Authentication & Access Control
- **Authorized Administrator Email:** `kotkarchaitanya18@gmail.com`
- **Google Sign-In:** Click **"Sign in with Google"** with the authorized Google account (`kotkarchaitanya18@gmail.com`). Any other account will be automatically rejected.
- **Email & Password:** Enter `kotkarchaitanya18@gmail.com` with your password to log in or register. All other email addresses are strictly denied admin access.
