// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Navigation, Routing & Core Utilities           ║
// ║  Developer  : Siyabonga Mdletshe                             ║
// ║  GitHub     : @siyabonga                                     ║
// ║  Branch     : feature/navigation-routing                     ║
// ╚══════════════════════════════════════════════════════════════╝
// ══════════════════════════════════════════════
//  MOBILE SIDEBAR
// ══════════════════════════════════════════════
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ══════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════
const NAV_CONFIG = {
  admin:        [['dashboard','Dashboard','grid'],['appointments','Appointments','calendar'],['queue','Queue','clock'],['reports','Reports','file'],['users','User Management','users'],['audit','Audit Log','shield'],['profile','My Profile','user']],
  receptionist: [['dashboard','Dashboard','grid'],['appointments','Appointments','calendar'],['queue','Queue','clock'],['booking','New Booking','plus'],['profile','My Profile','user']],
  doctor:       [['dashboard','Dashboard','grid'],['appointments','Appointments','calendar'],['consultations','Consultations','clipboard'],['my-queue','My Queue','clock'],['profile','My Profile','user']],
  nurse:        [['dashboard','Dashboard','grid'],['queue','Queue','clock'],['appointments','Appointments','calendar'],['vitals','Record Vitals','heart'],['profile','My Profile','user']],
  student:      [['dashboard','Dashboard','grid'],['booking','Book Appointment','calendar'],['my-appointments','My Appointments','list'],['queue-status','Queue Status','clock'],['profile','My Profile','user']],
};
const ICONS = {
  grid:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  calendar:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  file:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  users:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  user:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  clipboard:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  heart:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  plus:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  list:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  shield:`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};

function buildSidebar() {
  const nav = NAV_CONFIG[currentUser.roleKey] || NAV_CONFIG.student;
  const pendingCount = DB.appointments.filter(a=>a.status==='pending').length;
  const qCount = DB.queue.filter(q=>q.status==='waiting').length;
  const emgCount = DB.emergencies.filter(e=>e.status==='active'||e.status==='responding').length;
  let html = `
    <div class="sidebar-logo">
      <div class="logo-mark"><svg viewBox="0 0 24 24"><path fill="white" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>
      <div class="logo-text">Campus<span>Care</span></div>
    </div>
    <div class="sidebar-sect">Navigation</div>`;
  nav.forEach(([page, label, icon]) => {
    const badge = (page==='appointments' && pendingCount>0 && ['admin','receptionist'].includes(currentUser.roleKey))
      ? `<span class="nav-badge">${pendingCount}</span>` :
      (page==='queue' && qCount>0) ? `<span class="nav-badge" style="background:var(--red)">${qCount}</span>` : '';
    html += `<button class="nav-item" id="nav-${page}" onclick="navTo('${page}');closeSidebar()">${ICONS[icon]||''} ${label}${badge}</button>`;
  });
  html += `
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="doLogout()">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
      <div class="user-card" onclick="navTo('profile');closeSidebar()">
        <div class="ava" style="background:${currentUser.color}">${currentUser.initials}</div>
        <div style="flex:1;min-width:0">
          <div class="u-name">${currentUser.name}</div>
          <div class="u-role">${currentUser.role}</div>
        </div>
      </div>
    </div>`;
  document.getElementById('sidebar').innerHTML = html;
  const unread = DB.notifications.filter(n=>n.unread).length;
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread>0 ? '' : 'none';
}

function buildTopbarAva() {
  const el = document.getElementById('topbarAva');
  el.style.background = currentUser.color;
  el.innerHTML = `<span style="color:white;font-size:10.5px;font-weight:700">${currentUser.initials}</span>`;
}

// ══════════════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard:'Dashboard',appointments:'Appointments',queue:'Queue Management',
  reports:'Reports & Analytics',users:'User Management',profile:'My Profile',
  booking:'New Booking','my-appointments':'My Appointments',
  'queue-status':'Queue Status',consultations:'Consultations',vitals:'Record Vitals','my-queue':'My Patient Queue',
  audit:'Audit Log'
};

async function navTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('nav-'+page);
  if (el) el.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || 'Dashboard';
  const area = document.getElementById('contentArea');

  // Pages that need fresh data from Supabase before rendering
  const needsRefresh = ['appointments','my-appointments','dashboard','reports','users','consultations'];
  if (needsRefresh.includes(page)) {
    area.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ink3);font-size:13px">Loading…</div>';
    await Promise.all([
      refreshAppointments(),
      refreshEmergencies(),
      page === 'users' ? loadUsersFromSupabase() : Promise.resolve(),
    ]);
  }

  const pageMap = {
    dashboard:renderDashboard, appointments:renderAppointments, queue:renderQueue, 'my-queue':renderMyQueue,
    reports:renderReports, users:renderUsers, profile:renderProfile,
    booking:renderBooking, 'my-appointments':renderMyAppointments,
    'queue-status':renderQueueStatus, consultations:renderConsultations,
    vitals:renderVitals, audit:renderAuditLog
  };
  area.innerHTML = (pageMap[page]||renderDashboard)();
  if (page==='appointments') initApptFilters();
  if (page==='queue') initQueueFilters();
  if (page==='users') initUserFilters();
}

// Refresh only appointments from Supabase (fast, targeted)
async function refreshAppointments() {
  try {
    const { data, error } = await sb.from('appointments').select('*').order('created_at');
    if (error) { console.error('refreshAppointments:', error.message); return; }
    if (data) {
      DB.appointments = data.map(a => ({
        id:        a.appointment_ref,
        _uuid:     a.id,
        patientId: a.patient_id,
        patient:   a.patient_name,
        studentId: a.student_id||'',
        doctor:    a.doctor||'TBD',
        date:      a.date,
        time:      a.time,
        type:      a.type,
        status:    a.status,
        notes:     a.notes||'',
        source:    a.source||'online',
      }));
    }
  } catch(e) {
    console.error('refreshAppointments error:', e);
  }
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function initials(name) { return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
const AVA_C = ['linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#a18cd1,#fbc2eb)','linear-gradient(135deg,#ffecd2,#fcb69f)'];
function getAvaColor(name) { let h=0; for(let i=0;i<name.length;i++) h=(h+name.charCodeAt(i))%AVA_C.length; return AVA_C[h]; }
function statusBadge(s) { return {pending:'b-pending',approved:'b-approved',completed:'b-completed',rejected:'b-rejected',cancelled:'b-rejected'}[s]||'b-normal'; }
function nowTime() { return new Date().toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'}); }
function addNotification(msg, type='info') {
  DB.notifications.unshift({id:'N-'+Date.now(),msg,time:'Just now',type,unread:true});
  buildSidebar(); buildTopbarAva();
}
function addAudit(action, detail, user) {
  auditLog.unshift({action,detail,user:user||currentUser?.name||'System',time:nowTime(),date:'2026-03-01'});
}
function reorderQueue() {
  let pos=1;
  DB.queue.filter(q=>q.status!=='done').sort((a,b)=>(a.type==='emergency'&&b.type!=='emergency')?-1:1).forEach(q=>{q.pos=pos++;q.waitMin=(q.pos-1)*8;});
}
function getBookingDoctors() { return DB.users.filter(u=>u.role==='doctor'&&u.status==='active'&&u.doctorType==='booking'); }
function getWalkinDoctors()  { return DB.users.filter(u=>u.role==='doctor'&&u.status==='active'&&(u.doctorType==='walkin'||u.doctorType==='booking')); }
function getActiveDoctors()  { return DB.users.filter(u=>u.role==='doctor'&&u.status==='active'); }
function getActiveNurses()   { return DB.users.filter(u=>u.role==='nurse'&&u.status==='active'); }
function getDoctorOptions(docs, selected='') {
  return docs.map(d=>`<option value="${d.name}" ${d.name===selected?'selected':''}>${d.name}${d.doctorType==='walkin'?' 🚑':''} — ${d.dept}</option>`).join('');
}
// Nurse multi-select HTML
function getNurseCheckboxes() {
  return getActiveNurses().map(n=>`
    <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12.5px;padding:4px 0">
      <input type="checkbox" name="nurseCheck" value="${n.name}" style="accent-color:var(--teal)"> ${n.name} · ${n.dept}
    </label>`).join('');
}
function getSelectedNurses() {
  return Array.from(document.querySelectorAll('input[name="nurseCheck"]:checked')).map(x=>x.value);
}

// Get or create medical record for patient
function getOrCreateRecord(patientId, name, studentId) {
  if (!DB.medicalRecords[patientId]) {
    DB.medicalRecords[patientId] = {patientId,name,studentId:studentId||'Unknown',bloodType:'Unknown',allergies:'None known',chronicConditions:'None',emergencyContact:'Not set',visits:[]};
  }
  return DB.medicalRecords[patientId];
}

// ══════════════════════════════════════════════
//  CASCADE EFFECTS
// ══════════════════════════════════════════════
async function cascadeApproveAppt(apptId) {
  const a = DB.appointments.find(x=>x.id===apptId);
  if (!a) return;
  // Save to Supabase first
  const { error } = await sb.from('appointments').update({ status:'approved' }).eq('appointment_ref', apptId);
  if (error) { toast('Failed to approve: '+error.message,'error'); return; }
  a.status = 'approved';
  if (!DB.queue.find(q=>q.apptId===apptId)) {
    DB.queue.push({id:'Q-'+Date.now(),apptId,patient:a.patient,type:a.type,doctor:a.doctor,pos:DB.queue.filter(q=>q.status!=='done').length+1,status:'waiting',waitMin:DB.queue.filter(q=>q.status!=='done').length*8});
    reorderQueue();
  }
  addNotification(`Appointment #${apptId} approved for ${a.patient}`, 'success');
  addAudit('Appointment Approved', `#${apptId} — ${a.patient} assigned to ${a.doctor}`, currentUser.name);
  buildSidebar();
}

async function cascadeCompleteAppt(apptId) {
  const a = DB.appointments.find(x=>x.id===apptId);
  if (!a) return;
  const { error } = await sb.from('appointments').update({ status:'completed' }).eq('appointment_ref', apptId);
  if (error) { toast('Failed to complete: '+error.message,'error'); return; }
  a.status = 'completed';
  const q = DB.queue.find(x=>x.apptId===apptId);
  if (q) q.status = 'done';
  reorderQueue();
  addNotification(`Consultation completed — ${a.patient} (${a.doctor})`, 'success');
  addAudit('Consultation Completed', `#${apptId} — ${a.patient}`, currentUser.name);
}

async function cascadeRejectAppt(apptId, reason) {
  const a = DB.appointments.find(x=>x.id===apptId);
  if (!a) return;
  const { error } = await sb.from('appointments').update({ status:'rejected', notes: (a.notes||'') + (reason ? ' [Rejected: '+reason+']' : '') }).eq('appointment_ref', apptId);
  if (error) { toast('Failed to reject: '+error.message,'error'); return; }
  a.status = 'rejected';
  DB.queue = DB.queue.filter(q=>q.apptId!==apptId);
  reorderQueue();
  addNotification(`Appointment #${apptId} rejected: ${reason}`, 'warning');
  addAudit('Appointment Rejected', `#${apptId} — Reason: ${reason}`, currentUser.name);
  buildSidebar();
}

async function cascadeDeactivateUser(userId) {
  const u = DB.users.find(x=>x.id===userId);
  if (!u) return;
  const table = u._type==='student' ? 'students' : 'staff';
  const { error } = await sb.from(table).update({ is_active: false }).eq('id', userId);
  if (error) { toast('Failed to deactivate: '+error.message,'error'); return; }
  u.status = 'inactive';
  if (u.role==='doctor') {
    let cancelled = 0;
    for (const a of DB.appointments) {
      if ((a.doctor===u.name||a.doctorId===userId) && a.status==='pending') {
        await sb.from('appointments').update({ status:'rejected' }).eq('appointment_ref', a.id);
        a.status='rejected'; cancelled++;
      }
    }
    if (cancelled>0) addNotification(`${u.name} deactivated — ${cancelled} pending appointments cancelled`, 'warning');
  }
  addNotification(`User account deactivated: ${u.name}`, 'warning');
  addAudit('User Deactivated', `${u.name} (${u.role}) — account suspended`, currentUser.name);
}

// ══════════════════════════════════════════════
//  EMERGENCY ALERT SYSTEM
// ══════════════════════════════════════════════

// Student: open emergency form modal
function openEmergencyModal() {
  openModal('🚨 Send Emergency Alert',
    `<div style="background:#7f1d1d;color:white;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;display:flex;align-items:center;gap:10px">
      <span style="font-size:24px">🚨</span>
      <div><strong>This is for medical emergencies only.</strong><br>
      <span style="font-size:12px;opacity:.9">Clinic staff will be notified immediately. For life-threatening emergencies also call 999.</span></div>
    </div>
    <div class="field-group">
      <label class="field-label">What is happening? <span style="color:var(--red)">*</span></label>
      <textarea class="field-textarea" id="emgDesc" placeholder="e.g. I am having severe chest pain and difficulty breathing…" style="min-height:80px"></textarea>
    </div>
    <div class="field-group">
      <label class="field-label">Your Location</label>
      <input class="field-input" id="emgLocation" placeholder="e.g. Block B, Room 204 / Library / Cafeteria">
    </div>
    <div class="field-group">
      <label class="field-label">Severity</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px">
        <div id="sev-critical" onclick="selectSeverity('critical')" style="padding:10px 6px;border:2px solid var(--border);border-radius:10px;cursor:pointer;text-align:center;transition:.15s">
          <div style="font-size:18px">🔴</div><div style="font-size:11.5px;font-weight:700;margin-top:3px">Critical</div><div style="font-size:10px;color:var(--ink3)">Life-threatening</div>
        </div>
        <div id="sev-high" onclick="selectSeverity('high')" style="padding:10px 6px;border:2px solid var(--red);background:var(--red-bg);border-radius:10px;cursor:pointer;text-align:center;transition:.15s">
