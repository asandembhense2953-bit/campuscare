# CampusCare

**A web-based campus clinic management system.** CampusCare lets students book clinic appointments online, and gives clinic staff one place to manage appointments, walk-ins, the patient queue, medical records and emergencies.

**Live demo:** https://asandembhense2953-bit.github.io/campuscare/

---

## Why I built it

Campus clinics often run on paper registers, phone calls and long waiting lines. Students don't know when they will be seen, reception can't easily see who is waiting, and a doctor opening a file has no quick view of a patient's earlier visits.

I built CampusCare to show how a small, modern web app can fix those problems:

- Students book and manage their own appointments, and can see where they are in the queue.
- Reception and nursing staff see the whole day at a glance instead of keeping track on paper.
- Doctors get the patient's record, vitals and past consultations in one screen.
- Emergencies can be raised and answered immediately, without relying on a phone call.

It also gave me a chance to build a complete, role-based application from scratch using only core web technologies and a hosted database, with no framework to hide how things work.

---

## What it does

CampusCare has five user roles. Each role sees only the screens and actions that belong to them.

| Role | What they can do |
| --- | --- |
| **Student** | Register an account, book and edit appointments, see queue status, view their own appointments and profile |
| **Receptionist** | Approve or reject bookings, register walk-in patients, manage the waiting queue |
| **Nurse** | Record vitals, assist in the queue, respond to and assist with emergencies |
| **Doctor** | Call the next patient, mark no-shows, open medical records, complete consultations |
| **Admin** | Manage users, handle password-reset requests, view reports and export them to CSV, review the audit log |

### Main features

- **Appointment booking** with available time slots, a booking window, and conflict checks so the same slot cannot be booked twice
- **Approval workflow:** bookings are approved, rejected or cancelled, and each action updates the related records
- **Live queue management:** walk-ins and booked patients join one queue, with call-next, done and no-show actions
- **Medical records, vitals and consultations** kept per patient
- **Emergency alerts** with severity levels, responder assignment and an ambulance call option
- **User management:** admins add, edit, deactivate and reactivate users; students can self-register
- **Password security:** forced password change on first login, and an admin-handled password-reset request flow
- **Notifications and audit log** so important actions are visible and traceable
- **Reports** with CSV export
- **Responsive layout** that works on desktop and mobile

---

## How it works

CampusCare is a single-page application with no build step and no front-end framework.

```
Browser (HTML + CSS + JavaScript)
        │   HTTPS / REST
        ▼
Supabase  ──  Auth (login, sessions)
          └─  PostgreSQL (appointments, students, staff, emergencies, ...)
```

1. **Front end.** `index.html` holds the page structure, `styles.css` the design, and `app.js` all of the application logic: login, role-based navigation, every screen, and every action.
2. **Authentication.** Users sign in through Supabase Auth. After login, the app reads the user's role and builds the sidebar and screens for that role only.
3. **Data.** The app talks to Supabase's REST API directly through a small hand-written client in `app.js`, with no SDK. Data lives in PostgreSQL, and access is controlled with Supabase Row Level Security (RLS).
4. **Hosting.** The site is served as static files from GitHub Pages. There is no server of my own to run or maintain.
5. **Keeping the database awake.** Supabase pauses free projects after a period of inactivity, so a scheduled GitHub Actions workflow (`.github/workflows/supabase-keep-alive.yml`) sends a small read-only request every three days.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | Vanilla HTML, CSS and JavaScript |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth with Row Level Security |
| Hosting | GitHub Pages |
| Automation | GitHub Actions (scheduled keep-alive) |

---

## Project structure

```
campuscare/
├── index.html        Page structure and login screen
├── styles.css        All styling
├── app.js            Application logic, role-based screens, Supabase client
└── .github/
    └── workflows/
        └── supabase-keep-alive.yml   Scheduled database keep-alive
```

---

## Running it locally

The app is plain static files, so any simple web server works.

```bash
# from the project folder
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

To use your own database, create a Supabase project and set `SUPABASE_URL` and `SUPABASE_ANON` at the top of `app.js` to your project's URL and public (anon) key.

---

## Author

Built by **Asande Mbhense**.
