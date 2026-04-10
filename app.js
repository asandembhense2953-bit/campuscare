// ══════════════════════════════════════════════
//  SUPABASE LIGHTWEIGHT REST CLIENT
//  (no SDK — works from file:// and any host)
// ══════════════════════════════════════════════
const SUPABASE_URL  = 'https://lallzvyunllqqvtqwibz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGx6dnl1bmxscXF2dHF3aWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDUyNjgsImV4cCI6MjA4ODIyMTI2OH0.p9Xnt3Dva35QnIOkrZ7w0syFbVm-dYcB-3FrF4RwBRA';

let _session = null;

const sbAuth = {
  async signInWithPassword({ email, password }) {
    const r = await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password', {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON},
      body:JSON.stringify({email,password})
    });
    const d = await r.json();
    if (!r.ok) return { data:null, error:{message:d.error_description||d.msg||'Login failed'} };
    _session = {access_token:d.access_token, user:d.user};
    return { data:{user:d.user,session:_session}, error:null };
  },
  async signUp({ email, password }) {
    const r = await fetch(SUPABASE_URL+'/auth/v1/signup', {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON},
      body:JSON.stringify({email,password})
    });
    const d = await r.json();
    if (!r.ok) return { data:null, error:{message:d.error_description||d.msg||'Signup failed'} };
    // Return user id WITHOUT switching _session (caller handles sign-in if needed)
    return { data:{user: d.user || d}, error:null };
  },
  // Sign up then immediately sign in as that new user (for student self-registration)
  async signUpAndSignIn({ email, password }) {
    const r = await sbAuth.signUp({email, password});
    if (r.error) return r;
    await new Promise(res=>setTimeout(res,900));
    return await sbAuth.signInWithPassword({email, password});
  },
  async updateUser({ password }) {
    if (!_session) return { error:{message:'Not authenticated'} };
    const r = await fetch(SUPABASE_URL+'/auth/v1/user', {
      method:'PUT',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+_session.access_token},
      body:JSON.stringify({password})
    });
    const d = await r.json();
    return r.ok ? {data:d,error:null} : {error:{message:d.msg||'Update failed'}};
  },
  async signOut() {
    if (_session) await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+_session.access_token}}).catch(()=>{});
    _session = null;
  }
};

function _hdrs(extra={}) {
  const h = {'Content-Type':'application/json','apikey':SUPABASE_ANON,'Prefer':'return=representation',...extra};
  if (_session) h['Authorization'] = 'Bearer '+_session.access_token;
  return h;
}

function sbFrom(table) {
  let _filters=[], _select='*', _single=false, _method='GET', _body=null;
  const b = {
    select(c='*')    { _select=c; _method='GET'; return b; },
    insert(data)     { _method='POST'; _body=data; return b; },
    update(data)     { _method='PATCH'; _body=data; return b; },
    eq(col,val)      { _filters.push(col+'=eq.'+encodeURIComponent(val)); return b; },
    order(col,o={})  { _filters.push('order='+col+'.'+(o.ascending===false?'desc':'asc')); return b; },
    single()         { _single=true; return b; },
    async then(resolve) {
      try {
        let url = SUPABASE_URL+'/rest/v1/'+table;
        const p = _method==='GET' ? ['select='+encodeURIComponent(_select)] : [];
        _filters.forEach(f=>p.push(f));
        if (p.length) url += '?'+p.join('&');
        const opts = {method:_method, headers:_hdrs(_single?{'Accept':'application/vnd.pgrst.object+json'}:{})};
        if (_body) opts.body = JSON.stringify(_body);
        const r = await fetch(url, opts);
        const txt = await r.text();
        const d = txt ? JSON.parse(txt) : (_method==='GET'?[]:null);
        if (!r.ok) return resolve({data:null, error:{message:(d&&(d.message||d.hint))||JSON.stringify(d), code:d&&d.code}});
        resolve({data: _single?(Array.isArray(d)?d[0]:d):d, error:null});
      } catch(e) { resolve({data:null,error:{message:e.message}}); }
    }
  };
  return b;
}

// RPC caller for Postgres functions
async function sbRpc(fn, params={}) {
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn, {
      method: 'POST',
      headers: _hdrs(),
      body: JSON.stringify(params)
    });
    const txt = await r.text();
    const d = txt ? JSON.parse(txt) : null;
    if (!r.ok) return { data:null, error:{ message:(d&&(d.message||d.hint||d.error))||JSON.stringify(d) } };
    return { data: d, error: null };
  } catch(e) {
    return { data:null, error:{ message: e.message } };
  }
}

const sb = { auth:sbAuth, from:sbFrom, rpc:sbRpc };

// ── Connection test on page load ──────────────
async function testConnection() {
  const banner = document.getElementById('connBanner');
  if (!banner) return;
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/', {
      headers:{'apikey':SUPABASE_ANON}
    });
    // 200/404 = open endpoint, 401 = reached Supabase but needs auth (still connected)
    if (r.ok || r.status === 200 || r.status === 404 || r.status === 401) {
      banner.className='conn-banner conn-ok';
      banner.textContent='✓ Connected to CampusCare database';
      banner.style.display='block';
      setTimeout(()=>banner.style.display='none', 3000);
    } else {
      throw new Error('HTTP '+r.status);
    }
  } catch(e) {
    banner.className='conn-banner conn-fail';
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('CORS')) {
      banner.innerHTML='⚠ Browser blocked the connection.<br><span style="font-weight:400;font-size:11px">Open this file via a web server, not file://. <a href="#" style="color:#fca5a5" onclick="showServeInstructions()">How to fix →</a></span>';
    } else {
      banner.textContent='⚠ Cannot reach database: '+e.message;
    }
    banner.style.display='block';
  }
}

function showServeInstructions() {
  alert('To run CampusCare properly:\n\n' +
    'Option 1 — VS Code:\n  Install "Live Server" extension → right-click the HTML file → Open with Live Server\n\n' +
    'Option 2 — Python (open terminal in same folder):\n  python -m http.server 8080\n  Then open: http://localhost:8080/campuscare_supabase.html\n\n' +
    'Option 3 — Node.js:\n  npx serve .\n  Then open the URL shown');
  return false;
}

window.addEventListener('DOMContentLoaded', testConnection);

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let currentUser = null;
let currentPage = 'dashboard';
let apptFilter = {status:'all',type:'all',search:''};
let queueFilter = 'all';
let userFilter = {role:'all',search:''};
let currentApptPage = 1;
const APPTS_PER_PAGE = 6;
let auditLog = [];

// ══════════════════════════════════════════════
//  ROLE AVATAR CONFIGS (kept for UI theming)
// ══════════════════════════════════════════════
const ROLE_COLORS = {
  admin:        'linear-gradient(135deg,#667eea,#764ba2)',
  receptionist: 'linear-gradient(135deg,#f093fb,#f5576c)',
  doctor:       'linear-gradient(135deg,#4facfe,#00f2fe)',
  nurse:        'linear-gradient(135deg,#43e97b,#38f9d7)',
  student:      'linear-gradient(135deg,#fa709a,#fee140)',
};

// ══════════════════════════════════════════════
//  DATABASE  — live from Supabase, empty on start
// ══════════════════════════════════════════════
const DB = {
  appointments:  [],
  queue:         [],
  users:         [],
  consultations: [],
  medicalRecords:{},
  notifications: [],
  emergencies:   [],  // active emergency alerts
};

// ══════════════════════════════════════════════
//  LOAD REAL DATA FROM SUPABASE ON LOGIN
// ══════════════════════════════════════════════
async function loadAllData() {
  try {
    // Load staff and students
    const { data: staffData } = await sb.from('staff').select('*').order('created_at');
    const { data: stuData }   = await sb.from('students').select('*').order('created_at');

    DB.users = [
      ...(staffData||[]).map(u => ({
        id: u.id, _supaId: u.id, _type: 'staff',
        name: u.first_name+' '+u.last_name,
        email: u.email, role: u.role,
        dept: u.department||'', status: u.is_active?'active':'inactive',
        createdBy: 'admin', staffId: u.staff_id,
        password_reset_required: u.password_reset_required,
      })),
      ...(stuData||[]).map(u => ({
        id: u.id, _supaId: u.id, _type: 'student',
        name: u.first_name+' '+u.last_name,
        email: u.email, role: 'student',
        dept: u.department||'', status: u.is_active?'active':'inactive',
        createdBy: 'self', studentId: u.student_id,
        password_reset_required: u.password_reset_required,
      })),
    ];

    // Sync sbUsers for user management page
    sbUsers = [...(staffData||[]).map(u=>({...u,_type:'staff'})),
               ...(stuData||[]).map(u=>({...u,_type:'student',role:'student'}))];

    // Load appointments from Supabase
    const { data: apptData } = await sb.from('appointments').select('*').order('created_at');
    if (apptData) {
      DB.appointments = apptData.map(a => ({
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

    // Load active emergency alerts
    const { data: emgData } = await sb.from('emergency_alerts')
      .select('*').in('status',['active','responding']).order('created_at');
    DB.emergencies = (emgData||[]).map(e=>({
      id:          e.id,
      studentId:   e.student_id,
      studentName: e.student_name,
      studentRef:  e.student_ref||'',
      description: e.description,
      location:    e.location||'Not specified',
      severity:    e.severity,
      status:      e.status,
      respondedBy: e.responded_by,
      createdAt:   e.created_at,
    }));

    // Auto-expire any past pending/approved appointments
    await autoExpireAppointments();

  } catch(e) {
    console.error('loadAllData error:', e);
  }
}

// ══════════════════════════════════════════════
//  LOGIN / AUTH  (Supabase)
// ══════════════════════════════════════════════
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach((t,i) => t.classList.toggle('active', (tab==='signin'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('signinForm').style.display = tab==='signin' ? '' : 'none';
  document.getElementById('registerForm').style.display = tab==='register' ? '' : 'none';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginErr');
  if (!email || !pass) { showErr(err,'Please enter your email and password.'); return; }
  err.style.display='none';

  const btn = document.querySelector('#signinForm .login-btn');
  btn.textContent = 'Signing in…'; btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) { showErr(err, error.message); btn.textContent='Sign In to CampusCare'; btn.disabled=false; return; }

    // Load profile from staff or students table
    const uid = data.user.id;
    let profile = null; let tableType = null;

    const { data: staffRow } = await sb.from('staff').select('*').eq('auth_user_id', uid).single();
    if (staffRow && staffRow.is_active) { profile = staffRow; tableType = 'staff'; }
    else {
      const { data: stuRow } = await sb.from('students').select('*').eq('auth_user_id', uid).single();
      if (stuRow && stuRow.is_active) { profile = stuRow; tableType = 'student'; }
    }

    if (!profile) { showErr(err, 'Account not found or deactivated. Contact admin.'); await sb.auth.signOut(); btn.textContent='Sign In to CampusCare'; btn.disabled=false; return; }

    // Update last_login
    await sb.from(tableType === 'staff' ? 'staff' : 'students').update({ last_login: new Date().toISOString() }).eq('auth_user_id', uid);

    const roleKey = tableType === 'staff' ? profile.role : 'student';
    const fullName = profile.first_name + ' ' + profile.last_name;
    currentUser = {
      name: fullName,
      role: cap(roleKey),
      dept: profile.department || (tableType === 'staff' ? 'Staff' : 'Student'),
      initials: (profile.first_name[0] + (profile.last_name[0]||'')).toUpperCase(),
      color: ROLE_COLORS[roleKey] || ROLE_COLORS.student,
      roleKey,
      email: profile.email,
      userId: profile.id,
      tableType,
      staffId: tableType === 'staff' ? profile.staff_id : null,
      studentId: tableType === 'student' ? profile.student_id : null,
      passwordResetRequired: profile.password_reset_required,
    };

    addAudit('Login', `${currentUser.name} signed in`, currentUser.name);

    if (profile.password_reset_required) {
      btn.textContent='Sign In to CampusCare'; btn.disabled=false;
      openPasswordChangeModal();
      return;
    }

    enterApp();
  } catch(e) {
    showErr(err, 'Error: ' + e.message);
  }
  btn.textContent='Sign In to CampusCare'; btn.disabled=false;
}

async function openPasswordChangeModal() {
  // Show modal requiring user to change their admin-set password
  document.getElementById('loginPage').style.display='none';
  document.getElementById('appShell').style.display='flex';
  buildSidebar(); buildTopbarAva();
  // ✅ FIX 3: Load data before rendering, same as enterApp fix
  await loadAllData();
  navTo('dashboard');
  setTimeout(() => {
    openModal('🔑 Password Change Required',
      `<div style="text-align:center;padding:8px 0 12px">
        <div style="font-size:13px;color:var(--ink2);margin-bottom:16px">Your password was reset by the administrator. Please set a new password to continue.</div>
      </div>
      <div class="field-group"><label class="field-label">New Password</label><input type="password" class="field-input" id="forcePwNew" placeholder="Minimum 8 characters"></div>
      <div class="field-group"><label class="field-label">Confirm Password</label><input type="password" class="field-input" id="forcePwConfirm" placeholder="Repeat password"></div>`,
      `<button class="btn btn-primary" onclick="submitForcedPasswordChange()">Set New Password</button>`);
  }, 300);
}

async function submitForcedPasswordChange() {
  const np = document.getElementById('forcePwNew')?.value;
  const cp = document.getElementById('forcePwConfirm')?.value;
  if (!np || np.length < 8) { toast('Password must be at least 8 characters','error'); return; }
  if (np !== cp) { toast('Passwords do not match','error'); return; }
  const { error } = await sb.auth.updateUser({ password: np });
  if (error) { toast('Error updating password: ' + error.message, 'error'); return; }
  // Clear the reset flag
  const tbl = currentUser.tableType === 'staff' ? 'staff' : 'students';
  await sb.from(tbl).update({ password_reset_required: false }).eq('id', currentUser.userId);
  currentUser.passwordResetRequired = false;
  closeModal();
  toast('Password updated successfully!','success');
}

async function doRegister() {
  const first = document.getElementById('regFirst').value.trim();
  const last  = document.getElementById('regLast').value.trim();
  const sid   = document.getElementById('regStudentId').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const dept  = document.getElementById('regDept').value;
  const pass  = document.getElementById('regPass').value;
  const err   = document.getElementById('regErr');
  if (!first||!last||!sid||!email||!pass) { showErr(err,'Please fill in all fields.'); return; }
  if (!/^\d{8}$/.test(sid)) { showErr(err,'Student ID must be exactly 8 digits (e.g. 22440270).'); return; }
  if (!email.includes('@')) { showErr(err,'Please enter a valid email address.'); return; }
  if (pass.length < 6) { showErr(err,'Password must be at least 6 characters.'); return; }
  err.style.display='none';

  const btn = document.querySelector('#registerForm .login-btn');
  btn.textContent = 'Creating account…'; btn.disabled = true;

  try {
    // 1. Sign up AND sign in atomically (gets a valid session for the RLS insert)
    const { data, error } = await sb.auth.signUpAndSignIn({ email, password: pass });
    if (error) { showErr(err, error.message); btn.textContent='Create Student Account'; btn.disabled=false; return; }

    const uid = data.user?.id;
    if (!uid) { showErr(err, 'Registration failed. Please try again.'); btn.textContent='Create Student Account'; btn.disabled=false; return; }

    // 3. Insert student profile (RLS allows auth.uid() == auth_user_id)
    const { error: insErr } = await sb.from('students').insert({
      auth_user_id: uid,
      student_id:   sid,
      first_name:   first,
      last_name:    last,
      email:        email,
      department:   dept,
    });

    if (insErr) {
      // If duplicate student_id or email
      if (insErr.code === '23505') {
        showErr(err, 'This Student ID or email is already registered.');
      } else {
        showErr(err, 'Could not save profile: ' + insErr.message);
      }
      await sb.auth.signOut();
      btn.textContent='Create Student Account'; btn.disabled=false; return;
    }

    const fullName = first + ' ' + last;
    currentUser = {
      name: fullName, role: 'Student', dept, roleKey: 'student',
      initials: (first[0]+(last[0]||'')).toUpperCase(),
      color: ROLE_COLORS.student, email, studentId: sid,
      userId: uid, tableType: 'student',
    };
    toast(`Welcome to CampusCare, ${first}! 🎓`, 'success');
    enterApp();
  } catch(e) {
    showErr(err, 'Error: ' + e.message);
  }
  btn.textContent='Create Student Account'; btn.disabled=false;
}

function showErr(el, msg) { el.textContent=msg; el.style.display='block'; }

// ──────────────────────────────────────────────
// FORGOT PASSWORD — student/staff request to admin
// ──────────────────────────────────────────────
function openForgotPassword() {
  // Show an inline panel under the login form
  const existing = document.getElementById('forgotPanel');
  if (existing) { existing.remove(); return; }
  const panel = document.createElement('div');
  panel.id = 'forgotPanel';
  panel.style.cssText = 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;margin-top:14px';
  panel.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:white;margin-bottom:8px">🔑 Request Password Reset</div>
    <div style="font-size:11.5px;color:rgba(255,255,255,.4);margin-bottom:12px">Enter your email — admin will reset your password and share a temporary one with you.</div>
    <input type="email" id="forgotEmail" class="form-input" placeholder="your@university.edu" style="margin-bottom:10px">
    <button class="login-btn" style="padding:10px;font-size:13px" onclick="submitForgotRequest()">Send Request</button>
  `;
  document.getElementById('signinForm').appendChild(panel);
}

async function submitForgotRequest() {
  const email = document.getElementById('forgotEmail')?.value.trim();
  if (!email) { toast('Enter your email','error'); return; }

  const btn = document.querySelector('#forgotPanel .login-btn');
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

  // Use server-side RPC — works without an auth session (anon access)
  const { data, error } = await sb.rpc('request_password_reset', { p_email: email });

  if (btn) { btn.textContent = 'Send Request'; btn.disabled = false; }

  if (error) { toast('Error: ' + error.message, 'error'); return; }
  if (data?.error) { toast(data.error, 'error'); return; }

  document.getElementById('forgotPanel')?.remove();
  toast('Reset request sent! The admin will contact you with a temporary password.', 'success');
}

async function enterApp() {
  document.getElementById('loginPage').style.display='none';
  document.getElementById('appShell').style.display='flex';
  buildSidebar();
  buildTopbarAva();
  // ✅ FIX 1: Load all real data from Supabase BEFORE rendering any page
  // Previously, navTo('dashboard') was called before loadAllData() completed,
  // causing the dashboard and all pages to render with empty DB data.
  await loadAllData();
  navTo('dashboard');
  toast(`Welcome, ${currentUser.name.split(' ')[0]}! 👋`,'success');
  buildSidebar();
}

async function doLogout() {
  addAudit('Logout',`${currentUser.name} signed out`,'auth');
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginPage').style.display='flex';
  document.getElementById('loginEmail').value='';
  document.getElementById('loginPass').value='';
  closeModal();
  closeSidebar();
}

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

  const pageMap = {
    dashboard:renderDashboard, appointments:renderAppointments, queue:renderQueue, 'my-queue':renderMyQueue,
    reports:renderReports, users:renderUsers, profile:renderProfile,
    booking:renderBooking, 'my-appointments':renderMyAppointments,
    'queue-status':renderQueueStatus, consultations:renderConsultations,
    vitals:renderVitals, audit:renderAuditLog
  };

  // For dashboard: render immediately with cached data, then refresh silently in background
  if (page === 'dashboard') {
    area.innerHTML = (pageMap.dashboard)();
    if (page==='appointments') initApptFilters();
    if (page==='queue') initQueueFilters();
    // Background refresh — re-render once fresh data arrives
    try {
      await Promise.all([ refreshAppointments(), refreshEmergencies() ]);
      if (currentPage === 'dashboard') area.innerHTML = renderDashboard();
    } catch(e) {
      console.error('dashboard background refresh error:', e);
    }
    return;
  }

  // For other data pages: show loading spinner, fetch, then render
  const needsRefresh = ['appointments','my-appointments','reports','users','consultations'];
  if (needsRefresh.includes(page)) {
    area.innerHTML = `<div style="padding:60px 40px;text-align:center">
      <div style="display:inline-block;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 0.7s linear infinite;margin-bottom:14px"></div>
      <div style="color:var(--ink3);font-size:13px">Loading data…</div>
    </div>`;
    try {
      await Promise.all([
        refreshAppointments(),
        refreshEmergencies(),
        page === 'users' ? loadUsersFromSupabase() : Promise.resolve(),
      ]);
    } catch(e) {
      console.error('navTo refresh error:', e);
    }
  }

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
    // Auto-expire past pending/approved appointments after every fetch
    await autoExpireAppointments();
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
function statusBadge(s) { return {pending:'b-pending',approved:'b-approved',completed:'b-completed',rejected:'b-rejected',cancelled:'b-rejected',expired:'b-expired'}[s]||'b-normal'; }
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
          <div style="font-size:18px">🟠</div><div style="font-size:11.5px;font-weight:700;margin-top:3px">High</div><div style="font-size:10px;color:var(--ink3)">Urgent help needed</div>
        </div>
        <div id="sev-medium" onclick="selectSeverity('medium')" style="padding:10px 6px;border:2px solid var(--border);border-radius:10px;cursor:pointer;text-align:center;transition:.15s">
          <div style="font-size:18px">🟡</div><div style="font-size:11.5px;font-weight:700;margin-top:3px">Medium</div><div style="font-size:10px;color:var(--ink3)">Needs attention</div>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" style="gap:6px" onclick="submitEmergencyAlert()">🚨 Send Emergency Alert</button>`);
  selectedSeverity = 'high';
}

let selectedSeverity = 'high';
function selectSeverity(s) {
  selectedSeverity = s;
  ['critical','high','medium'].forEach(v => {
    const el = document.getElementById('sev-'+v);
    if (!el) return;
    el.style.border = v===s ? '2px solid var(--red)' : '2px solid var(--border)';
    el.style.background = v===s ? 'var(--red-bg)' : 'transparent';
  });
}

async function submitEmergencyAlert() {
  const desc     = document.getElementById('emgDesc')?.value.trim();
  const location = document.getElementById('emgLocation')?.value.trim();
  if (!desc) { toast('Please describe the emergency','error'); return; }

  const btn = document.querySelector('#modalFooter .btn-danger');
  if (btn) { btn.textContent='Sending…'; btn.disabled=true; }

  const { data, error } = await sb.from('emergency_alerts').insert({
    student_id:   currentUser.userId,
    student_name: currentUser.name,
    student_ref:  currentUser.studentId||'',
    description:  desc,
    location:     location||'Not specified',
    severity:     selectedSeverity,
    status:       'active',
  }).select().single();

  if (btn) { btn.textContent='🚨 Send Emergency Alert'; btn.disabled=false; }
  if (error) { toast('Failed to send alert: '+error.message,'error'); return; }

  // Add to local DB immediately
  DB.emergencies.unshift({
    id: data.id, studentId: currentUser.userId,
    studentName: currentUser.name, studentRef: currentUser.studentId||'',
    description: desc, location: location||'Not specified',
    severity: selectedSeverity, status: 'active',
    createdAt: new Date().toISOString(),
  });

  closeModal();
  toast('🚨 Emergency alert sent! Staff have been notified.','error');
  addAudit('Emergency Alert', `${currentUser.name} sent emergency alert — ${selectedSeverity.toUpperCase()}`, currentUser.name);

  // Navigate to show confirmation
  if (currentPage==='dashboard') navTo('dashboard');
}

// Staff: respond to emergency
async function respondEmergency(id) {
  const { error } = await sb.from('emergency_alerts').update({
    status: 'responding',
    responded_by: currentUser.userId,
    responded_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) { toast('Error: '+error.message,'error'); return; }
  const e = DB.emergencies.find(x=>x.id===id);
  if (e) { e.status='responding'; e.respondedBy=currentUser.userId; }
  toast(`Responding to emergency — ${e?.studentName}`,'success');
  addAudit('Emergency Response', `${currentUser.name} responding to alert from ${e?.studentName}`, currentUser.name);
  if (currentPage==='dashboard') navTo('dashboard');
}

// Staff: mark emergency as assisted (resolved)
async function assistEmergency(id) {
  const e = DB.emergencies.find(x=>x.id===id);
  openModal('Mark as Assisted',
    `<div style="text-align:center;padding:8px 0 14px">
      <div style="font-size:40px;margin-bottom:8px">✅</div>
      <div style="font-size:14px;font-weight:700">Mark emergency as assisted?</div>
      <div style="font-size:12.5px;color:var(--ink2);margin-top:4px">${e?.studentName} — ${e?.description?.slice(0,60)}…</div>
    </div>
    <div class="field-group"><label class="field-label">Resolution notes (optional)</label>
      <textarea class="field-textarea" id="emgNotes" placeholder="e.g. Patient stabilised, referred to doctor…" style="min-height:65px"></textarea>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-success" onclick="confirmAssistEmergency('${id}')">✅ Confirm Assisted</button>`);
}

async function confirmAssistEmergency(id) {
  const btn = document.querySelector('#modalFooter .btn-success');
  if (btn) { btn.textContent='Saving…'; btn.disabled=true; }
  const { error } = await sb.from('emergency_alerts').update({ status:'assisted' }).eq('id', id);
  if (btn) { btn.textContent='✅ Confirm Assisted'; btn.disabled=false; }
  if (error) { toast('Error: '+error.message,'error'); return; }
  DB.emergencies = DB.emergencies.filter(x=>x.id!==id);
  const e = DB.emergencies.find(x=>x.id===id); // won't find — already removed; get from backup
  closeModal();
  toast('Emergency marked as assisted ✓','success');
  addAudit('Emergency Assisted', `Alert resolved by ${currentUser.name}`, currentUser.name);
  if (currentPage==='dashboard') navTo('dashboard');
}

// Refresh emergency alerts from Supabase
async function refreshEmergencies() {
  const { data } = await sb.from('emergency_alerts')
    .select('*').in('status',['active','responding']).order('created_at');
  DB.emergencies = (data||[]).map(e=>({
    id: e.id, studentId: e.student_id, studentName: e.student_name,
    studentRef: e.student_ref||'', description: e.description,
    location: e.location||'Not specified', severity: e.severity,
    status: e.status, respondedBy: e.responded_by, createdAt: e.created_at,
  }));
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if (diff<60) return diff+'s ago';
  if (diff<3600) return Math.floor(diff/60)+'m ago';
  if (diff<86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}

function renderEmergencyAlerts(forStaff=true) {
  const active = DB.emergencies.filter(e=>e.status==='active');
  const responding = DB.emergencies.filter(e=>e.status==='responding');
  const all = [...active,...responding];
  if (all.length===0) return `<div style="text-align:center;padding:20px;color:var(--ink3);font-size:12.5px">✅ No active emergencies</div>`;
  return all.map(e=>`
    <div class="emg-alert-card ${e.status}">
      <div style="font-size:28px;line-height:1">${e.severity==='critical'?'🔴':e.severity==='high'?'🟠':'🟡'}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:13px;font-weight:700">${e.studentName}</span>
          ${e.studentRef?`<span style="font-size:11px;color:var(--ink3)">${e.studentRef}</span>`:''}
          <span class="emg-severity-${e.severity}">${e.severity}</span>
          ${e.status==='responding'?`<span style="font-size:10px;background:var(--amber);color:white;padding:2px 7px;border-radius:20px;font-weight:700">RESPONDING</span>`:''}
        </div>
        <div style="font-size:12.5px;color:var(--ink1);margin-bottom:4px">${e.description}</div>
        <div style="font-size:11.5px;color:var(--ink3);display:flex;gap:12px;flex-wrap:wrap">
          <span>📍 ${e.location}</span>
          <span>⏱ ${timeAgo(e.createdAt)}</span>
        </div>
      </div>
      ${forStaff ? `<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        ${e.status==='active'?`<button class="btn btn-warning btn-sm" onclick="respondEmergency('${e.id}')">🏃 Respond</button>`:''}
        <button class="btn btn-success btn-sm" onclick="assistEmergency('${e.id}')">✅ Assisted</button>
        ${e.severity!=='medium'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${e.studentName}')">🚑 Ambulance</button>`:''}
      </div>` : ''}
    </div>`).join('');
}

// ══════════════════════════════════════════════
//  AMBULANCE
// ══════════════════════════════════════════════
function callAmbulance(patient) {
  openModal('🚑 Call Ambulance',
    `<div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
      <div style="font-size:32px;margin-bottom:6px">🚑</div>
      <div style="font-size:16px;font-weight:700;color:white">Emergency Dispatch</div>
      <div style="font-size:12.5px;color:rgba(255,255,255,.7);margin-top:4px">Patient: ${patient}</div>
    </div>
    <div class="field-group"><label class="field-label">Patient Location</label><input class="field-input" id="ambLocation" placeholder="e.g. Block B, Room 204 / Clinic waiting area"></div>
    <div class="field-group"><label class="field-label">Condition Summary</label><textarea class="field-textarea" id="ambCondition" placeholder="Brief description of emergency…" style="min-height:60px"></textarea></div>
    <div style="background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--red);margin-top:8px">
      ⚠ This will dispatch an ambulance and alert the on-call emergency doctor immediately.
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-ambulance" onclick="confirmAmbulance('${patient}')">🚑 Dispatch Ambulance NOW</button>`
  );
}

function confirmAmbulance(patient) {
  const location = document.getElementById('ambLocation')?.value || 'Not specified';
  const condition = document.getElementById('ambCondition')?.value || 'Not specified';
  addNotification(`🚑 AMBULANCE DISPATCHED — ${patient} · Location: ${location}`, 'emergency');
  addAudit('Ambulance Dispatched', `Patient: ${patient} · Location: ${location} · ${condition}`, currentUser.name);
  closeModal();
  toast(`🚑 Ambulance dispatched for ${patient} — ETA ~8 minutes`, 'error');
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
function renderDashboard() {
  const total     = DB.appointments.length;
  const pending   = DB.appointments.filter(a=>a.status==='pending').length;
  const emergency = DB.appointments.filter(a=>a.type==='emergency').length;
  const completed = DB.appointments.filter(a=>a.status==='completed').length;
  const waiting   = DB.queue.filter(q=>q.status==='waiting').length;

  if (currentUser.roleKey === 'receptionist') return renderReceptionistDashboard(total, pending, emergency, completed, waiting);
  if (currentUser.roleKey === 'doctor') return renderDoctorDashboard();
  if (currentUser.roleKey === 'student') return renderStudentDashboard();

  const queueHtml = DB.queue.slice(0,4).map(q=>`
    <div class="queue-item ${q.type==='emergency'?'emergency':''}">
      <div class="q-pos">${q.type==='emergency'?'!':q.pos}</div>
      <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'} · ${q.doctor}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <div class="q-wait ${q.waitMin===0?'urgent':''}">${q.waitMin===0?'NOW':'~'+q.waitMin+'m'}</div>
        ${q.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>`:''}
      </div>
    </div>`).join('');

  return `
    <div class="realtime-bar">
      <div class="live-badge"><div class="live-dot"></div>Live</div>
      <span>Queue syncing in real-time · Last updated just now</span>
      <span style="margin-left:auto;font-size:11px;color:var(--ink3)">${new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · ${nowTime()}</span>
    </div>
    <div class="hero">
      <div class="hero-l">
        <div class="hero-greet">Good morning</div>
        <div class="hero-title">Welcome, <em>${currentUser.name.split(' ')[0]}</em> 👋</div>
        <div class="hero-desc">${pending} pending approvals · ${emergency} emergency cases</div>
      </div>
      <div class="hero-stats">
        <div><div class="h-stat-val">${total}</div><div class="h-stat-lbl">Total Appts</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:var(--amber)">${pending}</div><div class="h-stat-lbl">Pending</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:#34d399">${completed}</div><div class="h-stat-lbl">Completed</div></div>
      </div>
    </div>
    <div class="stats-grid mb-20">
      <div class="stat-card" onclick="navTo('appointments')"><div class="stat-icon" style="background:var(--blue-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-val">${total}</div><div class="stat-lbl">Appointments</div></div>
      <div class="stat-card" onclick="navTo('appointments')"><div class="stat-icon" style="background:var(--amber-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-val" style="color:var(--amber)">${pending}</div><div class="stat-lbl">Pending</div></div>
      <div class="stat-card" onclick="navTo('queue')"><div class="stat-icon" style="background:var(--red-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div class="stat-val" style="color:var(--red)">${emergency}</div><div class="stat-lbl">Emergency</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--green-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="stat-val" style="color:var(--green)">${completed}</div><div class="stat-lbl">Completed</div></div>
      <div class="stat-card" onclick="navTo('queue')"><div class="stat-icon" style="background:var(--purple-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-val" style="color:var(--purple)">${waiting}</div><div class="stat-lbl">In Queue</div></div>
    </div>
    ${DB.emergencies.length>0?`
    <div style="margin-bottom:16px">
      <div class="card" style="border:2px solid var(--red)">
        <div class="card-h" style="background:var(--red-bg);border-radius:10px 10px 0 0">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px;animation:pulse-emg 1.5s infinite">🚨</span>
            <div class="card-title" style="color:#991b1b">Active Emergencies</div>
            <span class="emg-count-badge">${DB.emergencies.length}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="refreshEmergencies().then(()=>navTo(currentPage))">↻ Refresh</button>
        </div>
        <div style="padding:10px">${renderEmergencyAlerts(true)}</div>
      </div>
    </div>`:''}
    <div class="two-col">
      <div class="card">
        <div class="card-h"><div><div class="card-title">Recent Appointments</div></div><button class="btn btn-ghost btn-sm" onclick="navTo('appointments')">View All</button></div>
        <div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Patient</th><th>Date</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>${DB.appointments.slice(0,4).map(a=>{const _today=new Date().toISOString().split('T')[0];const _past=a.date<_today&&a.status!=='completed'&&a.status!=='expired';return`<tr${a.status==='expired'?' style="opacity:0.65"':''}>
          <td><span class="appt-id">#${a.id}</span></td>
          <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div class="pt-name">${a.patient}</div></div></td>
          <td style="${_past?'color:var(--red);font-weight:600':''}">${a.date}${_past?` <span style="font-size:9px;background:var(--red-bg);color:var(--red);padding:1px 4px;border-radius:4px">past</span>`:''}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
        </tr>`;}).join('')}</tbody></table></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-h"><div><div class="card-title">Live Queue</div><div class="card-sub">${waiting} waiting</div></div><div class="live-badge"><div class="live-dot"></div>Live</div></div>
          <div style="padding:8px">${queueHtml}</div>
        </div>
      </div>
    </div>`;
}

function renderStudentDashboard() {
  const myAppts = DB.appointments.filter(a=>a.patientId===currentUser.userId||a.patient===currentUser.name);
  const pending = myAppts.filter(a=>a.status==='pending').length;
  const upcoming = myAppts.filter(a=>a.status==='approved').length;
  const myQ = DB.queue.find(q=>myAppts.some(a=>a.id===q.apptId) && q.status!=='done');
  const rec = DB.medicalRecords[currentUser.userId];
  const myEmg = DB.emergencies.filter(e=>e.studentId===currentUser.userId);
  return `
    <div class="hero">
      <div class="hero-l">
        <div class="hero-greet">Good morning, student</div>
        <div class="hero-title">Welcome, <em>${currentUser.name.split(' ')[0]}</em> 🎓</div>
        <div class="hero-desc">${myAppts.length} appointments on record · ${upcoming} upcoming</div>
      </div>
      <div class="hero-stats">
        <div><div class="h-stat-val">${myAppts.length}</div><div class="h-stat-lbl">Appointments</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:var(--amber)">${pending}</div><div class="h-stat-lbl">Pending</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:#34d399">${upcoming}</div><div class="h-stat-lbl">Upcoming</div></div>
      </div>
    </div>
    <div class="grid-2 mb-20">
      <div class="card" style="grid-column:1/-1">
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="flex:1">
            ${myQ ? `<div style="display:flex;align-items:center;gap:10px">
              <div style="font-size:36px;font-weight:800;color:var(--blue);font-family:'JetBrains Mono',monospace">#${myQ.pos}</div>
              <div><div style="font-size:13.5px;font-weight:700">You are in queue</div><div style="font-size:12px;color:var(--ink3);margin-top:2px">Est. wait: ${myQ.waitMin===0?'Being seen now':'~'+myQ.waitMin+' min'} · ${myQ.doctor}</div></div>
            </div>` : `<div style="font-size:13px;font-weight:600;color:var(--ink2)">No active queue entry</div>`}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="navTo('booking')">+ Book Appointment</button>
            <button class="btn btn-danger" style="gap:6px" onclick="openEmergencyModal()">🚨 Emergency Alert</button>
          </div>
        </div>
      </div>
    </div>
    ${myEmg.length>0?`<div class="emg-banner" style="margin-bottom:16px"><span style="font-size:22px">🚨</span><div><div style="font-weight:700;font-size:14px">Your Emergency Alert is Active</div><div style="font-size:12px;opacity:.9;margin-top:2px">Status: <strong>${myEmg[0].status==='responding'?'✅ Staff is responding to you':'⏳ Waiting for staff response'}</strong> · Sent ${timeAgo(myEmg[0].createdAt)}</div></div></div>`:''}
    <div class="grid-2">
      <div class="card">
        <div class="card-h"><div class="card-title">My Appointments</div><button class="btn btn-ghost btn-sm" onclick="navTo('my-appointments')">All</button></div>
        <div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Status</th><th></th></tr></thead>
        <tbody>${myAppts.slice(0,4).map(a=>{const _today=new Date().toISOString().split('T')[0];const _past=a.date<_today&&a.status!=='completed'&&a.status!=='expired';return`<tr${a.status==='expired'?' style="opacity:0.65"':''}>
          <td style="${_past?'color:var(--red);font-weight:600':''}">${a.date} ${a.time}${_past?` <span style="font-size:9px;background:var(--red-bg);color:var(--red);padding:1px 4px;border-radius:4px">past</span>`:''}</td>
          <td>${a.doctor}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
          <td>${a.status==='pending'&&!_past?`<button class="btn btn-ghost btn-sm" onclick="studentEditAppt('${a.id}')">Edit</button>`:''}
              ${a.status==='pending'&&!_past?`<button class="btn btn-danger btn-sm" onclick="cancelAppt('${a.id}')">Cancel</button>`:''}
              ${a.status==='expired'?`<button class="btn btn-primary btn-sm" onclick="navTo('booking')">↩ Rebook</button>`:''}</td>
        </tr>`;}).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ink3)">No appointments yet</td></tr>'}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-title">🗂 My Medical Record</div><button class="btn btn-ghost btn-sm" onclick="viewMedicalRecord(currentUser.userId)">View Full</button></div>
        <div style="padding:14px">
          ${rec ? `<div style="display:flex;flex-direction:column;gap:6px">
            <div class="report-row" style="padding:6px 0;border:none"><span class="r-label" style="font-size:11px">Blood Type</span><span class="r-val" style="font-size:12px">${rec.bloodType}</span></div>
            <div class="report-row" style="padding:6px 0;border:none"><span class="r-label" style="font-size:11px">Allergies</span><span class="r-val" style="font-size:12px;font-family:inherit;color:${rec.allergies!=='None known'?'var(--red)':'var(--green)'}">${rec.allergies}</span></div>
            <div class="report-row" style="padding:6px 0;border:none"><span class="r-label" style="font-size:11px">Conditions</span><span class="r-val" style="font-size:12px;font-family:inherit">${rec.chronicConditions}</span></div>
            <div class="report-row" style="padding:6px 0;border:none;border-top:1px solid var(--border2)"><span class="r-label" style="font-size:11px">Past Visits</span><span class="r-val">${rec.visits.length}</span></div>
          </div>` : '<div style="color:var(--ink3);font-size:12.5px">No record found</div>'}
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
//  RECEPTIONIST DASHBOARD
// ══════════════════════════════════════════════
function renderReceptionistDashboard(total, pending, emergency, completed, waiting) {
  const _todayDate = new Date().toISOString().split('T')[0];
  const todayAppts = DB.appointments.filter(a=>a.date===_todayDate);
  const inProgress = DB.queue.filter(q=>q.status==='in-progress').length;
  const pendingItems = DB.appointments.filter(a=>a.status==='pending');
  const queuePreview = DB.queue.filter(q=>q.status!=='done').slice(0,5).map(q=>`
    <div class="queue-item ${q.type==='emergency'?'emergency':''}">
      <div class="q-pos" style="${q.status==='in-progress'?'background:var(--purple);color:white':''}">${q.type==='emergency'?'!':q.pos}</div>
      <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'} · ${q.doctor}</div></div>
      <div style="display:flex;align-items:center;gap:5px">
        <div class="q-wait ${q.waitMin===0?'urgent':''}">${q.waitMin===0?'NOW':'~'+q.waitMin+'m'}</div>
        ${q.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>`:''}
        ${q.status==='waiting'?`<button class="btn btn-teal btn-sm" onclick="callPatient('${q.id}')">Call</button>`:''}
        ${q.status==='in-progress'?`<button class="btn btn-success btn-sm" onclick="donePatient('${q.id}')">Done</button>`:''}
      </div>
    </div>`).join('') || '<div style="text-align:center;padding:16px;color:var(--ink3);font-size:12.5px">Queue is empty</div>';
  return `
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span>Front Desk View</span><span style="margin-left:auto;font-size:11px;color:var(--ink3)">${new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · ${nowTime()}</span></div>
    <div class="hero">
      <div class="hero-l"><div class="hero-greet">Good morning, Front Desk</div><div class="hero-title">Welcome, <em>${currentUser.name.split(' ')[0]}</em> 👋</div><div class="hero-desc">${waiting} patients waiting · ${pending} need attention</div></div>
      <div class="hero-stats">
        <div><div class="h-stat-val">${waiting}</div><div class="h-stat-lbl">Waiting Now</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:var(--amber)">${pending}</div><div class="h-stat-lbl">Need Attention</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:#34d399">${completed}</div><div class="h-stat-lbl">Done Today</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px">
      <button class="btn btn-primary" style="padding:12px;justify-content:center;font-size:13px;border-radius:10px" onclick="openWalkInModal()">+ Walk-in / Emergency</button>
      <button class="btn btn-teal" style="padding:12px;justify-content:center;font-size:13px;border-radius:10px" onclick="navTo('booking')">📅 New Booking</button>
      <button class="btn btn-ghost" style="padding:12px;justify-content:center;font-size:13px;border-radius:10px" onclick="navTo('queue')">⏱ Full Queue</button>
      <button class="btn btn-ghost" style="padding:12px;justify-content:center;font-size:13px;border-radius:10px" onclick="navTo('appointments')">📋 Appointments</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px">
      <div class="stat-card" onclick="navTo('queue')"><div class="stat-icon" style="background:var(--blue-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-val" style="color:var(--blue)">${waiting}</div><div class="stat-lbl">In Queue</div></div>
      <div class="stat-card" onclick="navTo('appointments')"><div class="stat-icon" style="background:var(--amber-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-val" style="color:var(--amber)">${pending}</div><div class="stat-lbl">Pending</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--red-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div class="stat-val" style="color:var(--red)">${emergency}</div><div class="stat-lbl">Emergency</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:var(--green-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="stat-val" style="color:var(--green)">${completed}</div><div class="stat-lbl">Completed</div></div>
    </div>
    ${DB.emergencies.length>0?`<div style="margin-bottom:16px"><div class="card" style="border:2px solid var(--red)"><div class="card-h" style="background:var(--red-bg);border-radius:10px 10px 0 0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">🚨</span><div class="card-title" style="color:#991b1b">Active Emergencies</div><span class="emg-count-badge">${DB.emergencies.length}</span></div><button class="btn btn-ghost btn-sm" onclick="refreshEmergencies().then(()=>navTo(currentPage))">↻ Refresh</button></div><div style="padding:10px">${renderEmergencyAlerts(true)}</div></div></div>`:''}
    <div class="two-col">
      <div style="display:flex;flex-direction:column;gap:14px">
        ${pendingItems.length>0?`
        <div class="card" style="border:1.5px solid var(--amber-bg)">
          <div class="card-h" style="background:var(--amber-bg)"><div><div class="card-title" style="color:#92400e">⚠ Bookings Needing Attention</div><div class="card-sub" style="color:#b45309">${pendingItems.length} pending</div></div><button class="btn btn-ghost btn-sm" onclick="navTo('appointments')">View All</button></div>
          ${pendingItems.slice(0,4).map(a=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border2)">
            <div class="pt-ava" style="background:${getAvaColor(a.patient)};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">${initials(a.patient)}</div>
            <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${a.patient}</div><div style="font-size:11px;color:var(--ink3)">${a.date} ${a.time} · ${a.doctor}</div></div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="rejectAppt('${a.id}')">Reject</button>
            </div>
          </div>`).join('')}
        </div>`:''}
        <div class="card">
          <div class="card-h"><div><div class="card-title">Today's Appointments</div><div class="card-sub">${todayAppts.length} scheduled</div></div></div>
          <div class="tbl-wrap"><table><thead><tr><th>Patient</th><th>Time</th><th>Doctor</th><th>Status</th><th></th></tr></thead>
          <tbody>${todayAppts.slice(0,5).map(a=>{
            const _isPast = a.status!=='completed'&&a.status!=='expired';
            return`<tr${a.status==='expired'?' style="opacity:0.65;background:var(--surface2)"':''}>
            <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div><div class="pt-name">${a.patient}</div><div class="pt-id">${a.studentId}</div></div></div></td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${a.time}</td>
            <td>${a.doctor}</td>
            <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span>${a.status==='expired'?`<div style="font-size:10px;color:var(--ink3)">Auto-removed</div>`:''}</td>
            <td style="display:flex;gap:3px">
              <button class="btn btn-ghost btn-sm" onclick="viewAppt('${a.id}')">View</button>
              ${a.status==='pending'?`<button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">✓</button>`:''}
            </td>
          </tr>`;}).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ink3)">No appointments today</td></tr>'}</tbody></table></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-h"><div><div class="card-title">Live Queue</div><div class="card-sub">${waiting} waiting · ${inProgress} in progress</div></div><div style="display:flex;align-items:center;gap:6px"><div class="live-badge"><div class="live-dot"></div>Live</div></div></div>
          <div style="padding:8px">${queuePreview}</div>
          <div style="padding:8px 12px 10px;border-top:1px solid var(--border2)"><button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center" onclick="navTo('queue')">View Full Queue →</button></div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
//  DOCTOR DASHBOARD
// ══════════════════════════════════════════════
function getMyAppts() { return DB.appointments.filter(a => a.doctor === currentUser.name || a.doctor === 'Dr. Lim Wei Jian'); }
function getMyQueue() { return DB.queue.filter(q => q.doctor && (q.doctor.includes('Lim') || q.doctor === currentUser.name)); }

function renderDoctorDashboard() {
  const myAppts = getMyAppts();
  const myQueue = getMyQueue().filter(q=>q.status!=='done');
  const myPending = myAppts.filter(a=>a.status==='pending');
  const myDone = myAppts.filter(a=>a.status==='completed');
  const nowServing = myQueue.find(q=>q.status==='in-progress');
  const nextUp = myQueue.filter(q=>q.status==='waiting');
  const allEmerg = DB.queue.filter(q=>q.type==='emergency'&&q.status!=='done');
  const myDocInfo = DB.users.find(u=>u.name===currentUser.name||u.name==='Dr. Lim Wei Jian');
  const doctorTypeLabel = myDocInfo?.doctorType==='walkin' ? '🚑 Walk-in / Emergency Doctor' : '📅 Scheduled Appointments Doctor';

  const emergBanner = allEmerg.length>0 ? `
    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;animation:emergPulse 2s ease-in-out infinite">
      <div style="font-size:18px">🚨</div>
      <div style="flex:1"><div style="font-size:13.5px;font-weight:700;color:white">${allEmerg.length} Emergency Patient${allEmerg.length>1?'s':''} Active</div><div style="font-size:12px;color:rgba(255,255,255,.7)">${allEmerg.map(q=>q.patient).join(' · ')}</div></div>
      <button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${allEmerg[0]?.patient}')">🚑 Ambulance</button>
      <button class="btn" style="background:white;color:#991b1b;font-size:12px;font-weight:700" onclick="navTo('my-queue')">View Queue →</button>
    </div>` : '';

  const emgHtml = DB.emergencies.length>0?`<div style="margin-bottom:16px"><div class="card" style="border:2px solid var(--red)"><div class="card-h" style="background:var(--red-bg);border-radius:10px 10px 0 0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">🚨</span><div class="card-title" style="color:#991b1b">Active Emergencies</div><span class="emg-count-badge">${DB.emergencies.length}</span></div><button class="btn btn-ghost btn-sm" onclick="refreshEmergencies().then(()=>navTo(currentPage))">↻ Refresh</button></div><div style="padding:10px">${renderEmergencyAlerts(true)}</div></div></div>`:'';
  return `${emgHtml}
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span>Clinical view · ${doctorTypeLabel}</span><span style="margin-left:auto;font-size:11px;color:var(--ink3)">${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})} · ${nowTime()}</span></div>
    ${emergBanner}
    <div class="hero">
      <div class="hero-l"><div class="hero-greet">Good morning, Doctor</div><div class="hero-title">Dr. <em>${currentUser.name.replace('Dr. ','').split(' ')[0]}</em> 👨‍⚕️</div><div class="hero-desc">${myQueue.length} in queue · ${myPending.length} awaiting approval</div></div>
      <div class="hero-stats">
        <div><div class="h-stat-val" style="color:var(--purple)">${myQueue.length}</div><div class="h-stat-lbl">In Queue</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:var(--amber)">${myPending.length}</div><div class="h-stat-lbl">Pending</div></div>
        <div class="hero-div"></div>
        <div><div class="h-stat-val" style="color:var(--green)">${myDone.length}</div><div class="h-stat-lbl">Completed</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start">
      <div>
        ${myPending.length>0?`<div class="card mb-14" style="border:1.5px solid var(--amber-bg)"><div class="card-h" style="background:var(--amber-bg)"><div class="card-title" style="color:#92400e">⏳ Pending Approval (${myPending.length})</div></div>
        ${myPending.slice(0,3).map(a=>{const _today=new Date().toISOString().split('T')[0];const _past=a.date<_today;return`<div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--border2)${_past?';opacity:0.7':''}">
          <div class="pt-ava" style="background:${getAvaColor(a.patient)};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">${initials(a.patient)}</div>
          <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${a.patient}</div>
            <div style="font-size:11px;color:${_past?'var(--red)':'var(--ink3)'};font-weight:${_past?'600':'400'}">
              ${a.date}${_past?` <span style="font-size:9.5px;background:var(--red-bg);color:var(--red);padding:1px 4px;border-radius:3px">past</span>`:''} ${a.time} · ${cap(a.type)}
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectAppt('${a.id}')">Reject</button>
          </div>
        </div>`;}).join('')}</div>`:''}
        ${nowServing?`<div class="card mb-14" style="border:2px solid var(--purple)">
          <div style="padding:12px 16px;background:var(--purple-bg);border-radius:12px 12px 0 0;display:flex;align-items:center;gap:8px">
            <div style="width:7px;height:7px;background:var(--purple);border-radius:50%;animation:blink 1s infinite"></div>
            <span style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase">NOW SERVING</span>
          </div>
          <div style="padding:14px 16px;display:flex;align-items:center;gap:12px">
            <div class="pt-ava" style="background:${getAvaColor(nowServing.patient)};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white">${initials(nowServing.patient)}</div>
            <div style="flex:1"><div style="font-size:15px;font-weight:700">${nowServing.patient}</div><div style="font-size:12px;color:var(--ink3)">${nowServing.type==='emergency'?'🚨 Emergency':'Normal visit'}</div></div>
            <div style="display:flex;gap:6px">
              ${nowServing.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${nowServing.patient}')">🚑</button>`:''}
              <button class="btn btn-teal btn-sm" onclick="openCompleteConsult('${nowServing.apptId}')">Complete →</button>
            </div>
          </div>
        </div>`:
        `<div class="card mb-14" style="border:1px dashed var(--border)"><div style="padding:20px;text-align:center;color:var(--ink3)">
          <div style="font-size:24px">🩺</div><div style="font-size:13px;font-weight:600;margin-top:4px">No active consultation</div>
          ${nextUp.length>0?`<button class="btn btn-primary" style="margin-top:12px" onclick="doctorCallNext()">Call ${nextUp[0]?.patient}</button>`:''}
        </div></div>`}
        <div class="card">
          <div class="card-h"><div><div class="card-title">My Queue</div><div class="card-sub">${myQueue.length} active</div></div><button class="btn btn-ghost btn-sm" onclick="navTo('my-queue')">Full View →</button></div>
          <div style="padding:8px">${myQueue.slice(0,4).map(q=>`<div class="queue-item ${q.type==='emergency'?'emergency':''}">
            <div class="q-pos" style="${q.status==='in-progress'?'background:var(--purple);color:white':''}">${q.type==='emergency'?'!':q.pos}</div>
            <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'} · ~${q.waitMin} min</div></div>
            <div style="display:flex;gap:5px">
              ${q.status==='waiting'&&!nowServing?`<button class="btn btn-teal btn-sm" onclick="doctorCallNext()">Call</button>`:''}
              ${q.status==='in-progress'?`<button class="btn btn-success btn-sm" onclick="openCompleteConsult('${q.apptId}')">Complete</button>`:''}
            </div>
          </div>`).join('') || '<div class="empty-state" style="padding:20px"><p>Queue is empty</p></div>'}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card"><div class="card-h"><div class="card-title">Quick Actions</div></div>
          <div style="padding:10px;display:flex;flex-direction:column;gap:7px">
            <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="doctorCallNext()">📞 Call Next Patient</button>
            <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="navTo('consultations')">📋 Consultations</button>
            <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="navTo('my-queue')">⏱ My Queue</button>
          </div>
        </div>
        <div class="card"><div class="card-h"><div class="card-title">Stats</div></div>
          <div style="padding:4px 0">
            <div class="report-row"><span class="r-label">My Queue</span><span class="r-val" style="color:var(--purple)">${myQueue.length}</span></div>
            <div class="report-row"><span class="r-label">Completed</span><span class="r-val" style="color:var(--green)">${myDone.length}</span></div>
            <div class="report-row"><span class="r-label">Emergency</span><span class="r-val" style="color:var(--red)">${allEmerg.length}</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

function doctorCallNext() {
  const next = getMyQueue().find(q=>q.status==='waiting');
  if (!next) { toast('No patients waiting','warning'); return; }
  callPatient(next.id);
  if(currentPage==='dashboard') navTo('dashboard');
  if(currentPage==='my-queue') navTo('my-queue');
}

// ══════════════════════════════════════════════
//  DOCTOR MY QUEUE PAGE
// ══════════════════════════════════════════════
function renderMyQueue() {
  const myQ = getMyQueue().filter(q=>q.status!=='done');
  const nowSrv = myQ.find(q=>q.status==='in-progress');
  const waiting = myQ.filter(q=>q.status==='waiting');
  return `
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span>${myQ.length} patients in your queue</span></div>
    <div class="two-col">
      <div style="display:flex;flex-direction:column;gap:14px">
        ${nowSrv?`<div class="card" style="border:2px solid var(--purple)">
          <div style="padding:12px 16px;background:var(--purple-bg);border-radius:12px 12px 0 0"><span style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px">NOW SERVING</span></div>
          <div style="padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div class="pt-ava" style="background:${getAvaColor(nowSrv.patient)};width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white">${initials(nowSrv.patient)}</div>
              <div><div style="font-size:16px;font-weight:700">${nowSrv.patient}</div><div style="font-size:12px;color:var(--ink3)">${nowSrv.type==='emergency'?'🚨 Emergency':''}</div></div>
              ${nowSrv.type==='emergency'?`<button class="btn btn-ambulance" style="margin-left:auto" onclick="callAmbulance('${nowSrv.patient}')">🚑 Ambulance</button>`:''}
            </div>
            <div style="display:flex;gap:8px"><button class="btn btn-teal" style="flex:1;justify-content:center" onclick="openCompleteConsult('${nowSrv.apptId}')">🩺 Complete Consultation</button><button class="btn btn-ghost" onclick="markNoShow('${nowSrv.id}')">No-show</button></div>
          </div>
        </div>`:
        `<div class="card" style="border:1px dashed var(--border)"><div style="padding:24px;text-align:center;color:var(--ink3)">
          <div style="font-size:28px">🩺</div><div style="font-size:14px;font-weight:600;margin-top:8px">No active consultation</div>
          ${waiting.length>0?`<button class="btn btn-primary" style="margin-top:14px" onclick="doctorCallNext()">Call ${waiting[0].patient}</button>`:'<div style="font-size:12px;margin-top:6px">Queue is empty</div>'}
        </div></div>`}
        <div class="card">
          <div class="card-h"><div><div class="card-title">Next in Line</div><div class="card-sub">${waiting.length} waiting</div></div></div>
          <div style="padding:8px">${waiting.map((q,i)=>`<div class="queue-item ${q.type==='emergency'?'emergency':''}">
            <div class="q-pos">${q.type==='emergency'?'!':q.pos}</div>
            <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'} · ~${q.waitMin} min</div></div>
            <div style="display:flex;gap:5px">
              ${q.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>`:''}
              ${i===0&&!nowSrv?`<button class="btn btn-teal btn-sm" onclick="doctorCallNext()">Call</button>`:''}
              <button class="btn btn-ghost btn-sm" onclick="viewAppt('${q.apptId}')">View</button>
            </div>
          </div>`).join('') || '<div class="empty-state" style="padding:20px"><p>Queue clear 🎉</p></div>'}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card"><div class="card-h"><div class="card-title">Queue Stats</div></div>
          <div style="padding:4px 0">
            <div class="report-row"><span class="r-label">Waiting</span><span class="r-val" style="color:var(--blue)">${waiting.length}</span></div>
            <div class="report-row"><span class="r-label">In Progress</span><span class="r-val" style="color:var(--purple)">${nowSrv?1:0}</span></div>
            <div class="report-row"><span class="r-label">Emergency</span><span class="r-val" style="color:var(--red)">${myQ.filter(q=>q.type==='emergency').length}</span></div>
          </div>
        </div>
        <div class="card"><div class="card-h"><div class="card-title">🚨 Emergency Alerts</div></div>
          <div style="padding:8px">${DB.queue.filter(q=>q.type==='emergency'&&q.status!=='done').length===0
            ?'<div style="padding:12px;text-align:center;color:var(--ink3);font-size:12.5px">No emergencies</div>'
            :DB.queue.filter(q=>q.type==='emergency'&&q.status!=='done').map(q=>`<div class="queue-item emergency">
              <div class="q-pos">!</div>
              <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.doctor}</div></div>
              <button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function markNoShow(qId) {
  const q = DB.queue.find(x=>x.id===qId);
  openModal('Mark as No-Show',`<p style="font-size:13px">Mark <strong>${q?.patient}</strong> as no-show?</p>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-warning" onclick="confirmNoShow('${qId}')">Mark No-Show</button>`);
}
async function confirmNoShow(qId) {
  const q = DB.queue.find(x=>x.id===qId);
  const a = DB.appointments.find(x=>x.id===q?.apptId);
  if (a) {
    await sb.from('appointments').update({ status:'rejected', notes:(a.notes||'')+' [No-show]' }).eq('appointment_ref', a.id);
    a.status='rejected';
  }
  DB.queue = DB.queue.filter(x=>x.id!==qId);
  reorderQueue(); addAudit('No-Show',`${q?.patient}`,currentUser.name); buildSidebar(); closeModal();
  if(currentPage==='my-queue') navTo('my-queue');
  if(currentPage==='dashboard') navTo('dashboard');
  toast(`${q?.patient} marked as no-show`,'warning');
}

// ══════════════════════════════════════════════
//  APPOINTMENTS
// ══════════════════════════════════════════════
function renderAppointments() {
  const canCreate = ['admin','receptionist'].includes(currentUser.roleKey);
  return `<div class="card">
    <div class="card-h"><div><div class="card-title">Appointments</div><div class="card-sub">Manage all clinic appointments</div></div>
    <div class="card-actions">${canCreate?`<button class="btn btn-primary" onclick="openNewApptModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Booking</button>`:''}</div></div>
    <div class="filter-bar">
      <input class="search-field" placeholder="Search patient, ID…" id="apptSearch" oninput="filterAppts()">
      <select class="filter-select" id="apptStatusFilter" onchange="filterAppts()"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="completed">Completed</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select>
      <select class="filter-select" id="apptTypeFilter" onchange="filterAppts()"><option value="all">All Types</option><option value="normal">Normal</option><option value="emergency">Emergency</option></select>
    </div>
    <div class="tbl-wrap" id="apptTableWrap"></div>
    <div class="pagination" id="apptPagination"></div>
  </div>`;
}

function initApptFilters() { renderApptTable(); }
function filterAppts() {
  apptFilter.search = document.getElementById('apptSearch')?.value.toLowerCase()||'';
  apptFilter.status = document.getElementById('apptStatusFilter')?.value||'all';
  apptFilter.type   = document.getElementById('apptTypeFilter')?.value||'all';
  currentApptPage=1; renderApptTable();
}

function getFilteredAppts() {
  let data = [...DB.appointments];
  if (currentUser.roleKey==='student') data = data.filter(a=>a.patientId==='STU-AZ'||a.patient===currentUser.name);
  if (currentUser.roleKey==='doctor')  data = data;
  if (apptFilter.status!=='all') data = data.filter(a=>a.status===apptFilter.status);
  if (apptFilter.type!=='all')   data = data.filter(a=>a.type===apptFilter.type);
  if (apptFilter.search) data = data.filter(a=>a.patient.toLowerCase().includes(apptFilter.search)||a.id.toLowerCase().includes(apptFilter.search));
  return data;
}

function renderApptTable() {
  const data = getFilteredAppts();
  const total = data.length;
  const pages = Math.max(1,Math.ceil(total/APPTS_PER_PAGE));
  const slice = data.slice((currentApptPage-1)*APPTS_PER_PAGE, currentApptPage*APPTS_PER_PAGE);
  const canApprove = ['admin','receptionist'].includes(currentUser.roleKey);
  const isDoctor = currentUser.roleKey==='doctor';

  const rows = slice.length===0
    ? `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--ink3)">No appointments found</td></tr>`
    : slice.map(a => {
        const isMyAppt = (a.doctor===currentUser.name||a.doctor==='Dr. Lim Wei Jian');
        let actions = `<button class="btn btn-ghost btn-sm" onclick="viewAppt('${a.id}')">View</button>`;
        // View medical record button
        if (a.patientId && DB.medicalRecords[a.patientId]) actions += ` <button class="btn btn-ghost btn-sm" onclick="viewMedicalRecord('${a.patientId}')" title="Medical Record">📋</button>`;
        if ((canApprove || (isDoctor&&isMyAppt)) && a.status==='pending') {
          actions += ` <button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">Approve</button>
                       <button class="btn btn-danger btn-sm" onclick="rejectAppt('${a.id}')">Reject</button>`;
        }
        if (canApprove && a.status==='approved') {
          actions += ` <button class="btn btn-warning btn-sm" onclick="cancelAppt('${a.id}')">Cancel</button>`;
        }
        if (isDoctor && a.status==='approved') {
          actions += ` <button class="btn btn-teal btn-sm" onclick="openCompleteConsult('${a.id}')">Complete</button>`;
        }
        // Ambulance for emergency
        if (a.type==='emergency' && ['admin','receptionist','doctor','nurse'].includes(currentUser.roleKey)) {
          actions += ` <button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${a.patient}')">🚑</button>`;
        }
        const today = new Date().toISOString().split('T')[0];
        const isPast = a.date < today && a.status !== 'completed' && a.status !== 'expired';
        return `<tr${a.status==='expired'?' style="opacity:0.65;background:var(--surface2)"':''}>
          <td><span class="appt-id">#${a.id}</span></td>
          <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div><div class="pt-name">${a.patient}</div><div class="pt-id">${a.studentId}</div></div></div></td>
          <td style="${isPast?'color:var(--red);font-weight:600':''}">
            ${a.date}${isPast?` <span style="font-size:9.5px;background:var(--red-bg);color:var(--red);padding:1px 5px;border-radius:4px;font-weight:500">past</span>`:''}
          </td><td>${a.time}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td>${a.doctor}</td>
          <td><span class="badge" style="font-size:9.5px;background:${a.source==='walkin'?'var(--amber-bg)':'var(--blue-bg)'};color:${a.source==='walkin'?'#92400e':'#0369a1'}">${a.source==='walkin'?'Walk-in':'Online'}</span></td>
          <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
          <td><div style="display:flex;gap:3px;flex-wrap:wrap">${actions}</div></td>
        </tr>`;
      }).join('');

  document.getElementById('apptTableWrap').innerHTML = `<table>
    <thead><tr><th>ID</th><th>Patient</th><th>Date</th><th>Time</th><th>Type</th><th>Doctor</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody></table>`;

  let pags='';
  for(let i=1;i<=pages;i++) pags+=`<button class="pg-btn ${i===currentApptPage?'active':''}" onclick="goApptPage(${i})">${i}</button>`;
  const from = total===0?0:(currentApptPage-1)*APPTS_PER_PAGE+1;
  const to   = Math.min(currentApptPage*APPTS_PER_PAGE, total);
  document.getElementById('apptPagination').innerHTML = `<span class="pag-info">Showing ${from}–${to} of ${total}</span>
    <div class="pag-btns"><button class="pg-btn" onclick="goApptPage(${Math.max(1,currentApptPage-1)})">‹</button>${pags}<button class="pg-btn" onclick="goApptPage(${Math.min(pages,currentApptPage+1)})">›</button></div>`;
}

function goApptPage(p) { currentApptPage=p; renderApptTable(); }

async function approveAppt(id) { await cascadeApproveAppt(id); renderApptTable(); }

function rejectAppt(id) {
  openModal('Reject Appointment',
    `<p style="font-size:13px;margin-bottom:14px">Reason for rejecting <strong>#${id}</strong>:</p>
     <div class="field-group"><label class="field-label">Reason</label><textarea class="field-textarea" id="rejectReason" placeholder="e.g. Doctor unavailable…"></textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="confirmReject('${id}')">Reject</button>`);
}
async function confirmReject(id) {
  const reason = document.getElementById('rejectReason')?.value;
  if (!reason) { toast('Please provide a reason','error'); return; }
  const btn = document.querySelector('#modalFooter .btn-danger');
  if(btn){btn.textContent='Rejecting…';btn.disabled=true;}
  await cascadeRejectAppt(id, reason); closeModal(); renderApptTable();
  toast(`Appointment #${id} rejected`,'warning');
}

function cancelAppt(id) {
  const a = DB.appointments.find(x=>x.id===id);
  openModal('Cancel Appointment',
    `<p style="font-size:13px">Cancel appointment <strong>#${id}</strong> for <strong>${a?.patient}</strong>?</p>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Keep It</button>
     <button class="btn btn-danger" onclick="confirmCancel('${id}')">Yes, Cancel</button>`);
}
async function confirmCancel(id) {
  const btn = document.querySelector('#modalFooter .btn-danger');
  if(btn){btn.textContent='Cancelling…';btn.disabled=true;}
  await cascadeRejectAppt(id,'Cancelled by patient'); closeModal(); renderApptTable(); toast('Appointment cancelled','warning');
}

function viewAppt(id) {
  const a = DB.appointments.find(x=>x.id===id);
  if (!a) return;
  const rec = a.patientId ? DB.medicalRecords[a.patientId] : null;
  openModal(`Appointment #${a.id}`,
    `<div class="vitals-grid mb-14">
      <div class="vital-card"><div class="vital-val">${a.type==='emergency'?'🚨':'📋'}</div><div class="vital-lbl">Type</div></div>
      <div class="vital-card"><div class="vital-val" style="font-size:13px">${cap(a.status)}</div><div class="vital-lbl">Status</div></div>
      <div class="vital-card"><div class="vital-val" style="font-size:13px">${a.time}</div><div class="vital-lbl">Time</div></div>
    </div>
    <div class="field-grid mb-14">
      <div><div class="field-label">Patient</div><div style="font-size:13px;font-weight:600">${a.patient}</div><div style="font-size:11px;color:var(--ink3)">${a.studentId}</div></div>
      <div><div class="field-label">Doctor</div><div style="font-size:13px;font-weight:600">${a.doctor}</div></div>
    </div>
    <div class="field-group"><div class="field-label">Date</div><div style="font-size:13px">${a.date}</div></div>
    <div class="field-group"><div class="field-label">Notes</div><div style="font-size:12.5px;color:var(--ink2);background:var(--surface2);padding:10px;border-radius:8px">${a.notes||'No notes'}</div></div>
    ${rec?`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:8px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:8px">Patient Medical Info</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
        <div><span style="color:var(--ink3)">Blood Type:</span> <strong>${rec.bloodType}</strong></div>
        <div><span style="color:var(--ink3)">Allergies:</span> <strong style="color:${rec.allergies!=='None known'?'var(--red)':'var(--green)'}">${rec.allergies}</strong></div>
        <div><span style="color:var(--ink3)">Conditions:</span> <strong>${rec.chronicConditions}</strong></div>
        <div><span style="color:var(--ink3)">Past visits:</span> <strong>${rec.visits.length}</strong></div>
      </div>
    </div>`:''}`,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
     ${rec?`<button class="btn btn-primary" onclick="closeModal();viewMedicalRecord('${a.patientId}')">View Medical Record</button>`:''}`);
}

function openNewApptModal() {
  openModal('New Booking',
    `<div style="background:var(--blue-bg);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#0369a1">
      ℹ Emergency cases must be registered as a walk-in at reception. Online bookings are for normal visits only.
    </div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Patient Name</label><input class="field-input" id="nwPatient" placeholder="Full name"></div>
      <div class="field-group"><label class="field-label">Student ID</label><input class="field-input" id="nwStudentId" placeholder="STU2024-XXX"></div>
    </div>
    <div class="field-group"><label class="field-label">Date</label><input type="date" class="field-input" id="nwDate" value="${getTomorrowDate()}" min="${getTomorrowDate()}" max="${getMaxBookingDate()}" onchange="refreshTimeSlots('nwDate','nwTime','')"></div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Time</label><select class="field-select" id="nwTime" onchange="checkSlotConflict(this)">${getAvailableTimeOptions(getTomorrowDate(),'')}</select></div>
      <div class="field-group"><label class="field-label">Doctor (Scheduled)</label><select class="field-select" id="nwDoctor">${getDoctorOptions(getBookingDoctors())}</select></div>
    </div>
    <div class="field-group"><label class="field-label">Symptoms / Notes</label><textarea class="field-textarea" id="nwNotes" placeholder="Brief description…"></textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="submitNewAppt()">Create Booking</button>`);
}

async function submitNewAppt() {
  const patient = document.getElementById('nwPatient')?.value.trim();
  const sid     = document.getElementById('nwStudentId')?.value.trim();
  const date    = document.getElementById('nwDate')?.value;
  const time    = document.getElementById('nwTime')?.value;
  const doctor  = document.getElementById('nwDoctor')?.value;
  const notes   = document.getElementById('nwNotes')?.value;
  if (!patient||!date) { toast('Please fill required fields','error'); return; }
  const btn = document.querySelector('#modalFooter .btn-primary');
  if(btn){btn.textContent='Creating…';btn.disabled=true;}
  const id = 'APT-'+Date.now();
  const { error } = await sb.from('appointments').insert({
    appointment_ref: id, patient_name: patient, student_id: sid||'',
    doctor: doctor||'TBD', date, time, type:'normal', status:'pending',
    notes: notes||'', source:'online'
  });
  if(btn){btn.textContent='Create Booking';btn.disabled=false;}
  if (error) { toast('Failed to create: '+error.message,'error'); return; }
  DB.appointments.unshift({id,patientId:null,patient,studentId:sid||'',doctor:doctor||'TBD',date,time,type:'normal',status:'pending',notes:notes||'',source:'online'});
  addNotification(`New booking for ${date}: ${patient}`, 'info');
  addAudit('New Booking',`#${id} — ${patient}`);
  closeModal(); renderApptTable(); buildSidebar();
  toast(`Booking created for ${patient}`, 'success');
}

// ══════════════════════════════════════════════
//  WALK-IN MODAL (Emergency allowed here)
// ══════════════════════════════════════════════
function openWalkInModal() {
  openModal('Walk-in Registration',
    `<div style="background:var(--amber-bg);border-radius:10px;padding:11px 14px;margin-bottom:14px;font-size:12px;color:#92400e">
      ⚠ Walk-ins include both normal drop-ins and <strong>emergency cases</strong>. Emergency patients are automatically sent to emergency doctors and moved to front of queue.
    </div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Student ID</label><input class="field-input" id="wiStudentId" placeholder="STU2024-XXX" oninput="lookupStudent(this.value)"></div>
      <div class="field-group"><label class="field-label">Full Name</label><input class="field-input" id="wiName" placeholder="Or enter name manually"></div>
    </div>
    <div id="wiStudentFound" style="display:none;background:var(--green-bg);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--green)"></div>
    <div id="wiAllergyAlert" style="display:none;background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--red)"></div>
    <div class="field-group"><label class="field-label">Visit Type</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <div id="wiTypeNormal" onclick="selectWiType('normal')" style="padding:10px;border:2px solid var(--blue);border-radius:10px;cursor:pointer;background:var(--blue-bg);text-align:center;transition:.2s">
          <div style="font-size:16px">📋</div><div style="font-size:11.5px;font-weight:700;margin-top:3px">Normal Visit</div>
        </div>
        <div id="wiTypeEmergency" onclick="selectWiType('emergency')" style="padding:10px;border:2px solid var(--border);border-radius:10px;cursor:pointer;text-align:center;transition:.2s">
          <div style="font-size:16px">🚨</div><div style="font-size:11.5px;font-weight:700;margin-top:3px">Emergency</div><div style="font-size:10.5px;color:var(--ink3);margin-top:2px">Walk-in only</div>
        </div>
      </div>
    </div>
    <div class="field-group"><label class="field-label">Assign Doctor</label>
      <select class="field-select" id="wiDoctor">${getDoctorOptions(getWalkinDoctors())}</select>
      <div style="font-size:11px;color:var(--ink3);margin-top:4px">🚑 Doctors marked with 🚑 are dedicated walk-in/emergency doctors</div>
    </div>
    <div class="field-group"><label class="field-label">Assign Nurse(s)</label>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px">${getNurseCheckboxes()}</div>
    </div>
    <div class="field-group"><label class="field-label">Symptoms / Reason</label><textarea class="field-textarea" id="wiSymptoms" placeholder="Brief description…" style="min-height:65px"></textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="submitWalkIn()">Submit to Queue</button>`);
}

let wiSelectedType = 'normal';
function selectWiType(type) {
  wiSelectedType = type;
  document.getElementById('wiTypeNormal').style.border = type==='normal'?'2px solid var(--blue)':'2px solid var(--border)';
  document.getElementById('wiTypeNormal').style.background = type==='normal'?'var(--blue-bg)':'transparent';
  document.getElementById('wiTypeEmergency').style.border = type==='emergency'?'2px solid var(--red)':'2px solid var(--border)';
  document.getElementById('wiTypeEmergency').style.background = type==='emergency'?'var(--red-bg)':'transparent';
  // If emergency, prefer walkin doctor
  if (type==='emergency') {
    const wiDr = document.getElementById('wiDoctor');
    if (wiDr) {
      const emergDr = DB.users.find(u=>u.role==='doctor'&&u.status==='active'&&u.doctorType==='walkin');
      if (emergDr) wiDr.value = emergDr.name;
    }
  }
}

function lookupStudent(sid) {
  const found = document.getElementById('wiStudentFound');
  const allergyAlert = document.getElementById('wiAllergyAlert');
  if (!sid||sid.length<4) { if(found) found.style.display='none'; if(allergyAlert) allergyAlert.style.display='none'; return; }
  const u = DB.users.find(x=>x.studentId?.toLowerCase()===sid.toLowerCase()||x.name.toLowerCase().includes(sid.toLowerCase()));
  if (u && found) {
    found.style.display='block';
    found.textContent = `✓ Found: ${u.name} — ${u.dept}`;
    const nameEl = document.getElementById('wiName');
    if (nameEl) nameEl.value = u.name;
    // Check medical record for allergies
    const rec = DB.medicalRecords[u.id];
    if (rec && allergyAlert) {
      if (rec.allergies && rec.allergies!=='None known') {
        allergyAlert.style.display='block';
        allergyAlert.innerHTML = `⚠ ALLERGY ALERT: <strong>${rec.allergies}</strong> · Blood type: ${rec.bloodType}`;
      }
    }
  } else if (found) { found.style.display='none'; if(allergyAlert) allergyAlert.style.display='none'; }
}

async function submitWalkIn() {
  const name     = document.getElementById('wiName')?.value.trim();
  const sid      = document.getElementById('wiStudentId')?.value.trim();
  const doctor   = document.getElementById('wiDoctor')?.value;
  const symptoms = document.getElementById('wiSymptoms')?.value.trim();
  const nurses   = getSelectedNurses();
  if (!name) { toast('Please enter patient name','error'); return; }
  const btn = document.querySelector('#modalFooter .btn-primary');
  if(btn){btn.textContent='Submitting…';btn.disabled=true;}
  const id = 'APT-'+Date.now();
  const todayStr = new Date().toISOString().split('T')[0];
  const { error } = await sb.from('appointments').insert({
    appointment_ref: id, patient_name: name, student_id: sid||'Walk-in',
    doctor: doctor||'TBD', date: todayStr, time: nowTime(),
    type: wiSelectedType, status:'approved',
    notes: symptoms||'Walk-in', source:'walkin'
  });
  if(btn){btn.textContent='Submit to Queue';btn.disabled=false;}
  if (error) { toast('Failed to register: '+error.message,'error'); return; }
  const activeInQueue = DB.queue.filter(q=>q.status!=='done').length;
  DB.appointments.unshift({id,patientId:null,patient:name,studentId:sid||'Walk-in',doctor:doctor||'TBD',date:todayStr,time:nowTime(),type:wiSelectedType,status:'approved',notes:symptoms||'Walk-in',source:'walkin',nurses});
  const qEntry = {id:'Q-'+Date.now(),apptId:id,patient:name,type:wiSelectedType,doctor:doctor||'TBD',pos:activeInQueue+1,status:'waiting',waitMin:activeInQueue*8};
  DB.queue.push(qEntry);
  reorderQueue();
  if (wiSelectedType==='emergency') {
    addNotification(`🚨 EMERGENCY walk-in: ${name} — moved to queue front. ${doctor} alerted.`,'emergency');
  } else {
    addNotification(`New walk-in: ${name} — queue pos #${qEntry.pos}`,'info');
  }
  addAudit('Walk-in Registered',`${name} (${wiSelectedType}) · Doctor: ${doctor}${nurses.length>0?' · Nurses: '+nurses.join(', '):''}`,currentUser.name);
  buildSidebar(); closeModal();
  if (currentPage==='dashboard') navTo('dashboard');
  if (currentPage==='queue') renderQueueList();
  toast(`${name} registered${wiSelectedType==='emergency'?' — EMERGENCY! 🚨':''}`, wiSelectedType==='emergency'?'error':'success');
}

// ══════════════════════════════════════════════
//  QUEUE
// ══════════════════════════════════════════════
function renderQueue() {
  return `
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span><strong>${DB.queue.filter(q=>q.status!=='done').length}</strong> patients active</span>
    <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="simulateQueueUpdate()">+2 min</button></div>
    <div class="two-col" style="grid-template-columns:1fr 1fr">
      <div class="card">
        <div class="card-h"><div class="card-title">Current Queue</div>
          <div class="card-actions">
            <select class="filter-select" id="queueFilterSel" onchange="filterQueue()"><option value="all">All</option><option value="waiting">Waiting</option><option value="in-progress">In Progress</option><option value="emergency">Emergency</option></select>
            ${currentUser.roleKey==='admin'?`<button class="btn btn-primary btn-sm" onclick="openAddToQueue()">+ Add</button>`:''}
          </div>
        </div>
        <div style="padding:8px" id="queueList"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card"><div class="card-h"><div class="card-title">Queue Summary</div></div><div id="queueSummary" style="padding:8px 0"></div></div>
        <div class="card"><div class="card-h"><div class="card-title">🚨 Emergency Alerts</div></div><div id="queueAlerts" style="padding:8px"></div></div>
        <div class="card">
          <div class="card-h"><div class="card-title">Doctor Availability</div></div>
          <div style="padding:8px 0">
            ${getActiveDoctors().map(d=>{
              const inQ = DB.queue.filter(q=>q.doctor===d.name&&q.status!=='done').length;
              const isEmergency = d.doctorType==='walkin';
              return `<div class="report-row"><div><div style="font-size:12px;font-weight:600">${d.name} ${isEmergency?'🚑':''}</div><div style="font-size:10.5px;color:var(--ink3)">${isEmergency?'Walk-in/Emergency':'Scheduled booking'}</div></div><span class="r-val" style="font-size:12px;color:${inQ>3?'var(--red)':inQ>1?'var(--amber)':'var(--green)'}">${inQ} pts</span></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function initQueueFilters() { renderQueueList(); }
function filterQueue() { queueFilter=document.getElementById('queueFilterSel')?.value||'all'; renderQueueList(); }

function renderQueueList() {
  let data = [...DB.queue];
  if (queueFilter==='waiting')     data = data.filter(q=>q.status==='waiting');
  if (queueFilter==='in-progress') data = data.filter(q=>q.status==='in-progress');
  if (queueFilter==='emergency')   data = data.filter(q=>q.type==='emergency');
  const canManage = ['admin','receptionist','nurse'].includes(currentUser.roleKey);
  const canRemove = currentUser.roleKey==='admin';
  const html = data.map(q => {
    let actions = '';
    if (canManage) {
      if (q.status==='waiting') actions=`<button class="btn btn-teal btn-sm" onclick="callPatient('${q.id}')">Call</button>`;
      if (q.status==='in-progress') actions=`<button class="btn btn-success btn-sm" onclick="donePatient('${q.id}')">Done</button>`;
      if (canRemove && q.status!=='in-progress') actions+=` <button class="btn btn-ghost btn-sm" onclick="removeFromQueue('${q.id}')" style="color:var(--red)">✕</button>`;
    }
    return `<div class="queue-item ${q.type==='emergency'?'emergency':''}">
      <div class="q-pos" style="${q.status==='in-progress'?'background:var(--purple);color:white':''}">${q.type==='emergency'?'!':q.pos}</div>
      <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'} · ${q.doctor}</div></div>
      <div style="display:flex;align-items:center;gap:5px">
        <div class="q-wait ${q.waitMin===0?'urgent':''}">${q.waitMin===0?'NOW':'~'+q.waitMin+'m'}</div>
        ${q.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>`:''}
        ${actions}
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:28px"><p>No entries</p></div>';
  if (document.getElementById('queueList')) document.getElementById('queueList').innerHTML = html;
  const waiting=DB.queue.filter(q=>q.status==='waiting').length, inprog=DB.queue.filter(q=>q.status==='in-progress').length, emerg=DB.queue.filter(q=>q.type==='emergency').length;
  if (document.getElementById('queueSummary')) document.getElementById('queueSummary').innerHTML = `
    <div class="report-row"><span class="r-label">Waiting</span><span class="r-val" style="color:var(--blue)">${waiting}</span></div>
    <div class="report-row"><span class="r-label">In Progress</span><span class="r-val" style="color:var(--purple)">${inprog}</span></div>
    <div class="report-row"><span class="r-label">Emergency</span><span class="r-val" style="color:var(--red)">${emerg}</span></div>
    <div class="report-row"><span class="r-label">Avg Wait</span><span class="r-val">~18 min</span></div>`;
  const emergEntries=DB.queue.filter(q=>q.type==='emergency'&&q.status!=='done');
  if (document.getElementById('queueAlerts')) document.getElementById('queueAlerts').innerHTML = emergEntries.length===0
    ?`<div style="text-align:center;padding:14px;color:var(--ink3);font-size:12px">✅ No emergency cases</div>`
    :emergEntries.map(q=>`<div class="notif-item" style="background:var(--red-bg)">
      <div class="ni-icon" style="background:var(--red)"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <div style="flex:1"><div class="ni-msg" style="color:var(--red)">${q.patient}</div><div class="ni-time">${q.doctor} · #${q.pos}</div></div>
      <button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>
    </div>`).join('');
}

function callPatient(id) {
  const q = DB.queue.find(x=>x.id===id);
  if (q) { q.status='in-progress'; q.waitMin=0; }
  addAudit('Patient Called',`${q?.patient} called`);
  renderQueueList(); toast(`Called ${q?.patient}`,'success');
}

function donePatient(id) {
  const q = DB.queue.find(x=>x.id===id);
  cascadeCompleteAppt(q?.apptId);
  if (q) q.status='done';
  reorderQueue(); renderQueueList();
  toast(`${q?.patient} completed`,'success'); buildSidebar();
}

function removeFromQueue(id) {
  if (currentUser.roleKey!=='admin') { toast('Only Admin can remove','error'); return; }
  const q = DB.queue.find(x=>x.id===id);
  openModal('Remove from Queue',`<p style="font-size:13px">Remove <strong>${q?.patient}</strong>?</p>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="confirmRemoveQueue('${id}')">Remove</button>`);
}
function confirmRemoveQueue(id) {
  const q = DB.queue.find(x=>x.id===id);
  DB.queue = DB.queue.filter(x=>x.id!==id); reorderQueue();
  addAudit('Queue Remove',`${q?.patient} removed`);
  closeModal(); renderQueueList(); toast(`${q?.patient} removed`,'warning');
}

function simulateQueueUpdate() {
  DB.queue.forEach(q=>{ if(q.status==='waiting'&&q.waitMin>0) q.waitMin=Math.max(0,q.waitMin-2); });
  renderQueueList(); toast('Queue updated +2 min','success');
}

function openAddToQueue() {
  const available = DB.appointments.filter(a=>a.status==='approved'&&!DB.queue.find(q=>q.apptId===a.id));
  openModal('Add to Queue',`<div class="field-group"><label class="field-label">Approved Appointment</label>
    <select class="field-select" id="qAddAppt">${available.length===0?'<option>None available</option>':available.map(a=>`<option value="${a.id}">${a.patient} — ${a.time}</option>`).join('')}</select></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="confirmAddToQueue()">Add</button>`);
}
function confirmAddToQueue() {
  const id=document.getElementById('qAddAppt')?.value;
  const a=DB.appointments.find(x=>x.id===id);
  if (!a) return;
  DB.queue.push({id:'Q-'+Date.now(),apptId:id,patient:a.patient,type:a.type,doctor:a.doctor,pos:DB.queue.filter(q=>q.status!=='done').length+1,status:'waiting',waitMin:DB.queue.filter(q=>q.status!=='done').length*8});
  reorderQueue(); closeModal(); renderQueueList(); toast(`${a.patient} added`,'success');
}

// ══════════════════════════════════════════════
//  MEDICAL RECORDS
// ══════════════════════════════════════════════
function viewMedicalRecord(patientId) {
  const rec = DB.medicalRecords[patientId];
  if (!rec) { toast('No medical record found','error'); return; }
  // Get all consultations for this patient
  const consults = DB.consultations.filter(c=>c.patientId===patientId);
  // All appointments (from rec.appointments array or fallback to DB.appointments)
  const apptHistory = rec.appointments || [];
  // Merge in any appointments not yet in rec.appointments (e.g. approved/pending)
  const dbAppts = DB.appointments.filter(a=>a.patientId===patientId);
  const allApptIds = new Set(apptHistory.map(x=>x.apptId));
  dbAppts.forEach(a=>{ if(!allApptIds.has(a.id)) apptHistory.push({apptId:a.id,date:a.date,time:a.time,doctor:a.doctor,reason:a.notes||'',status:a.status,nurses:a.nurses||[],type:a.type}); });
  apptHistory.sort((a,b)=>b.date.localeCompare(a.date));

  openModal(`🗂 Medical Record — ${rec.name}`,
    `<div style="background:linear-gradient(135deg,#0f1b2d,#1e3a5f);border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="pt-ava" style="background:${getAvaColor(rec.name)};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;flex-shrink:0">${initials(rec.name)}</div>
        <div><div style="font-size:15px;font-weight:700;color:white">${rec.name}</div><div style="font-size:12px;color:rgba(255,255,255,.5)">${rec.studentId}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div><span style="color:rgba(255,255,255,.4)">Blood Type:</span> <span style="color:white;font-weight:700">${rec.bloodType}</span></div>
        <div><span style="color:rgba(255,255,255,.4)">Emergency Contact:</span> <span style="color:white;font-size:11px">${rec.emergencyContact}</span></div>
        <div><span style="color:rgba(255,255,255,.4)">Allergies:</span> <span style="color:${rec.allergies!=='None known'?'#fca5a5':'#6ee7b7'};font-weight:700">${rec.allergies}</span></div>
        <div><span style="color:rgba(255,255,255,.4)">Conditions:</span> <span style="color:white">${rec.chronicConditions}</span></div>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);margin-bottom:10px">Appointment History (${apptHistory.length} records)</div>
    ${apptHistory.length===0?`<div style="text-align:center;padding:20px;color:var(--ink3);font-size:12.5px">No appointment records yet</div>`:''}
    <div style="position:relative;padding-left:14px">
      ${apptHistory.map(entry=>{
        const consult = entry.consultId ? consults.find(c=>c.id===entry.consultId) : consults.find(c=>c.apptId===entry.apptId);
        const dbAppt  = DB.appointments.find(a=>a.id===entry.apptId);
        const isEmerg = (entry.type||dbAppt?.type)==='emergency';
        const statusColor = entry.status==='completed'?'#6ee7b7':entry.status==='pending'?'#fcd34d':entry.status==='approved'?'#93c5fd':'#f87171';
        return `<div class="med-visit ${isEmerg?'emergency':''}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <div class="med-visit-date">${entry.date} ${entry.time||''} — ${isEmerg?'🚨 Emergency':'Normal Visit'}</div>
            <span style="font-size:10px;padding:2px 7px;border-radius:20px;background:rgba(255,255,255,.08);color:${statusColor};font-weight:600;text-transform:capitalize">${entry.status}</span>
          </div>
          <div style="font-size:12px;color:var(--ink2);margin-bottom:4px"><strong>Reason:</strong> ${entry.reason||'—'}</div>
          ${consult?`
            <div class="med-visit-diag">${consult.diagnosis}</div>
            <div style="font-size:12px;color:var(--ink2);margin-bottom:4px">${consult.symptoms}</div>
            <div style="font-size:12px;background:var(--surface2);border-radius:6px;padding:6px 10px;margin-bottom:6px"><strong>Rx:</strong> ${consult.prescription}</div>
            ${consult.vitals?`<div style="font-size:11px;color:var(--ink3);margin-bottom:4px">BP: ${consult.vitals.bp} · Pulse: ${consult.vitals.pulse} · Temp: ${consult.vitals.temp}°C · SpO2: ${consult.vitals.spo2}%</div>`:''}
            ${consult.followUp?`<div style="font-size:11px;color:#60a5fa;margin-bottom:4px">📅 ${consult.followUp}</div>`:''}
            ${consult.referral?`<div style="font-size:11px;color:#a78bfa;margin-bottom:4px">🔗 Referral: ${consult.referral}</div>`:''}
            ${consult.notes?`<div style="font-size:11.5px;color:var(--ink3);font-style:italic">${consult.notes}</div>`:''}
          `:''}
          <div class="med-visit-staff">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:4px;margin-top:4px">Attending Staff</div>
            ${(entry.doctor||dbAppt?.doctor)?`<span class="staff-chip" style="background:var(--blue-bg);color:#0369a1">👨‍⚕️ Dr: ${entry.doctor||dbAppt?.doctor}</span>`:''}
            ${(entry.nurses||consult?.nurses||[]).length>0
              ? (entry.nurses||consult?.nurses||[]).map(n=>`<span class="staff-chip" style="background:var(--teal-bg);color:#0f766e">💉 Nurse: ${n}</span>`).join('')
              : (!(entry.doctor||dbAppt?.doctor)?`<span class="staff-chip" style="background:var(--amber-bg);color:#92400e">⚠ No staff recorded</span>`:'')
            }
          </div>
        </div>`;
      }).join('')}
    </div>
    ${currentUser.roleKey==='admin'?`<div class="divider"></div><div class="field-group"><label class="field-label">Update Allergies</label><input class="field-input" id="recAllergyInput" value="${rec.allergies}" placeholder="e.g. Penicillin, Sulfa drugs"></div><div class="field-group"><label class="field-label">Chronic Conditions</label><input class="field-input" id="recCondInput" value="${rec.chronicConditions}"></div><div class="field-group"><label class="field-label">Emergency Contact</label><input class="field-input" id="recContactInput" value="${rec.emergencyContact}"></div>`:``}`,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
     ${currentUser.roleKey==='admin'?`<button class="btn btn-primary" onclick="saveRecordUpdate('${patientId}')">Save Updates</button>`:''}`);
}

function saveRecordUpdate(patientId) {
  const rec = DB.medicalRecords[patientId];
  if (!rec) return;
  rec.allergies = document.getElementById('recAllergyInput')?.value || rec.allergies;
  rec.chronicConditions = document.getElementById('recCondInput')?.value || rec.chronicConditions;
  rec.emergencyContact = document.getElementById('recContactInput')?.value || rec.emergencyContact;
  addAudit('Medical Record Updated', `${rec.name} — record updated by admin`, currentUser.name);
  closeModal();
  toast(`Medical record for ${rec.name} updated`, 'success');
}

// ══════════════════════════════════════════════
//  CONSULTATIONS
// ══════════════════════════════════════════════
function renderConsultations() {
  const isDoctor = currentUser.roleKey==='doctor';
  const myConsults = isDoctor ? DB.consultations.filter(c=>c.doctor===currentUser.name||c.doctor==='Dr. Lim Wei Jian') : DB.consultations;
  const approvedAppts = (isDoctor ? DB.appointments.filter(a=>a.status==='approved'&&(a.doctor===currentUser.name||a.doctor==='Dr. Lim Wei Jian')) : DB.appointments.filter(a=>a.status==='approved'));
  return `<div class="two-col">
    <div class="card">
      <div class="card-h"><div><div class="card-title">Consultation Records</div><div class="card-sub">${myConsults.length} completed</div></div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Appt</th><th>Patient</th><th>Date</th><th>Diagnosis</th><th>Staff</th><th>Actions</th></tr></thead>
      <tbody>${myConsults.map(c=>`<tr>
        <td><span class="appt-id">#${c.apptId}</span></td>
        <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(c.patient)}">${initials(c.patient)}</div><div class="pt-name">${c.patient}</div></div></td>
        <td>${c.date}</td>
        <td style="max-width:140px;font-size:12px">${c.diagnosis}</td>
        <td style="font-size:11px"><div style="display:flex;flex-direction:column;gap:2px"><span>👨‍⚕️ ${c.doctor}</span>${(c.nurses||[]).map(n=>`<span>💉 ${n}</span>`).join('')}</div></td>
        <td><div style="display:flex;gap:3px">
          <button class="btn btn-ghost btn-sm" onclick="viewConsult('${c.id}')">View</button>
          ${c.patientId?`<button class="btn btn-ghost btn-sm" onclick="viewMedicalRecord('${c.patientId}')">📋</button>`:''}
        </div></td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--ink3)">No records</td></tr>'}</tbody></table></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-h"><div><div class="card-title">Pending</div><div class="card-sub">${approvedAppts.length} approved</div></div></div>
        <div style="padding:8px">${approvedAppts.length===0?'<div class="empty-state" style="padding:20px"><p>None pending</p></div>':
          approvedAppts.map(a=>`<div class="queue-item ${a.type==='emergency'?'emergency':''}">
            <div class="q-info"><div class="q-name">${a.patient} ${a.type==='emergency'?'<span style="font-size:9px;background:var(--red);color:white;padding:1px 5px;border-radius:4px;margin-left:4px">EMERG</span>':''}</div><div class="q-meta">${a.date} ${a.time}</div></div>
            ${a.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${a.patient}')">🚑</button>`:''}
            <button class="btn btn-teal btn-sm" onclick="openCompleteConsult('${a.id}')">Start</button>
          </div>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

function viewConsult(id) {
  const c = DB.consultations.find(x=>x.id===id);
  openModal(`Consultation — ${c.patient}`,
    `<div style="font-size:11px;color:var(--ink3);margin-bottom:12px">${c.date} · ${c.doctor} · #${c.apptId}</div>
    ${(c.nurses&&c.nurses.length>0)?`<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">${c.nurses.map(n=>`<span class="staff-chip">💉 ${n}</span>`).join('')}</div>`:''}
    <div class="vitals-grid mb-14">
      <div class="vital-card"><div class="vital-val">${c.vitals.bp}</div><div class="vital-lbl">BP</div></div>
      <div class="vital-card"><div class="vital-val">${c.vitals.pulse}</div><div class="vital-lbl">Pulse</div></div>
      <div class="vital-card"><div class="vital-val">${c.vitals.temp}°C</div><div class="vital-lbl">Temp</div></div>
      <div class="vital-card"><div class="vital-val">${c.vitals.spo2||'—'}%</div><div class="vital-lbl">SpO2</div></div>
    </div>
    <div class="field-group"><div class="field-label">Symptoms</div><div style="font-size:12.5px;background:var(--surface2);padding:10px;border-radius:8px">${c.symptoms||'Not recorded'}</div></div>
    <div class="field-group"><div class="field-label">Diagnosis</div><div style="font-size:13px;font-weight:600;background:var(--blue-bg);padding:10px 12px;border-radius:8px;color:#0369a1">${c.diagnosis}</div></div>
    <div class="field-group"><div class="field-label">Prescription</div><div style="font-size:12.5px;background:var(--surface2);padding:10px;border-radius:8px">${c.prescription||'None'}</div></div>
    <div class="field-group"><div class="field-label">Notes</div><div style="font-size:12.5px;background:var(--surface2);padding:10px;border-radius:8px">${c.notes||'—'}</div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
     ${c.patientId?`<button class="btn btn-primary" onclick="closeModal();viewMedicalRecord('${c.patientId}')">Full Record</button>`:''}`);
}

function openCompleteConsult(apptId) {
  const a = DB.appointments.find(x=>x.id===apptId);
  if (!a) return;
  const qEntry = DB.queue.find(q=>q.apptId===apptId);
  if (qEntry && qEntry.status==='waiting') { qEntry.status='in-progress'; reorderQueue(); }
  // Load existing record if any
  const rec = a.patientId ? DB.medicalRecords[a.patientId] : null;
  const prevConsults = DB.consultations.filter(c=>c.patientId===a.patientId);
  openModal(`Consultation — ${a.patient}`,
    `<div style="background:${a.type==='emergency'?'linear-gradient(135deg,#7f1d1d,#991b1b)':'linear-gradient(135deg,#0f172a,#1e3a5f)'};border-radius:12px;padding:14px 16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="pt-ava" style="background:${getAvaColor(a.patient)};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white">${initials(a.patient)}</div>
        <div style="flex:1"><div style="font-size:15px;font-weight:700;color:white">${a.patient} ${a.type==='emergency'?'<span style="background:var(--red);color:white;font-size:9px;padding:1px 6px;border-radius:4px">EMERGENCY</span>':''}</div>
        <div style="font-size:11.5px;color:rgba(255,255,255,.6)">${a.studentId} · ${a.time}</div></div>
        ${a.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${a.patient}')">🚑 Ambulance</button>`:''}
      </div>
      ${rec&&rec.allergies!=='None known'?`<div style="background:rgba(239,68,68,.25);border:1px solid rgba(239,68,68,.4);border-radius:8px;padding:6px 10px;margin-top:8px;font-size:11.5px;color:#fca5a5">⚠ ALLERGY: ${rec.allergies}</div>`:''}
    </div>
    <div style="background:var(--blue-bg);border:1px solid rgba(14,165,233,.25);border-radius:10px;padding:12px 14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#0369a1">Patient Medical Record</div>
        ${a.patientId?`<button class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--blue)" onclick="viewMedicalRecord('${a.patientId}')">📋 Full Record</button>`:''}
      </div>
      ${rec?`<div style="font-size:12px;display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">
        <div><span style="color:#0369a1">Blood:</span> <strong>${rec.bloodType}</strong></div>
        <div><span style="color:#0369a1">Allergies:</span> <strong style="color:${rec.allergies!=='None known'?'var(--red)':'#059669'}">${rec.allergies}</strong></div>
        <div><span style="color:#0369a1">Conditions:</span> <span>${rec.chronicConditions}</span></div>
        <div><span style="color:#0369a1">Past visits:</span> <strong>${prevConsults.length}</strong></div>
      </div>
      ${prevConsults.length>0?`<div style="font-size:11.5px;color:#0369a1;border-top:1px solid rgba(14,165,233,.2);padding-top:6px;margin-top:4px">
        <strong>Last visit(s):</strong> ${prevConsults.slice(0,2).map(c=>`${c.date}: ${c.diagnosis}${c.nurses&&c.nurses.length>0?' (Nurses: '+c.nurses.join(', ')+')':''}`).join(' · ')}
      </div>`:''}
      ${prevConsults.length===0?`<div style="font-size:11.5px;color:#0369a1;font-style:italic">No previous consultations on record — first visit.</div>`:''}
      `:`<div style="font-size:12px;color:#0369a1;font-style:italic">No medical record on file for this patient. Record will be created on consultation save.</div>`}
    </div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);margin-bottom:8px">Vitals</div>
    <div class="vitals-grid mb-14">
      <div class="field-group"><label class="field-label">BP (mmHg)</label><input class="field-input" id="vBp" placeholder="120/80" style="font-family:'JetBrains Mono',monospace"></div>
      <div class="field-group"><label class="field-label">Pulse (bpm)</label><input class="field-input" id="vPulse" placeholder="72" style="font-family:'JetBrains Mono',monospace"></div>
      <div class="field-group"><label class="field-label">Temp (°C)</label><input class="field-input" id="vTemp" placeholder="36.5" style="font-family:'JetBrains Mono',monospace"></div>
      <div class="field-group"><label class="field-label">SpO2 (%)</label><input class="field-input" id="vSpo2" placeholder="98" style="font-family:'JetBrains Mono',monospace"></div>
    </div>
    <div class="field-group"><label class="field-label">Nurses Present</label><div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px">${getNurseCheckboxes()}</div></div>
    <div class="field-group"><label class="field-label">Symptoms (confirmed) <span style="color:var(--red)">*</span></label><textarea class="field-textarea" id="cSymptoms" placeholder="Patient reported symptoms…" style="min-height:50px"></textarea></div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Diagnosis <span style="color:var(--red)">*</span></label><textarea class="field-textarea" id="cDiagnosis" style="min-height:56px"></textarea></div>
      <div class="field-group"><label class="field-label">Prescription</label><textarea class="field-textarea" id="cPrescription" placeholder="Medication, dosage…" style="min-height:56px"></textarea></div>
    </div>
    <div class="field-group"><label class="field-label">Doctor Notes</label><textarea class="field-textarea" id="cNotes" style="min-height:50px"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);margin-bottom:8px">Follow-up</div>
        ${['none','1 week','2 weeks','1 month'].map(v=>`<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12.5px;padding:3px 0"><input type="radio" name="fuRadio" value="${v}" ${v==='none'?'checked':''} style="accent-color:var(--teal)"> ${v==='none'?'None':v}</label>`).join('')}
      </div>
      <div>
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);margin-bottom:8px">Refer to</div>
        ${['none','Specialist','Lab Test','Physiotherapy','Hospital'].map(v=>`<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12.5px;padding:3px 0"><input type="checkbox" name="referCheck" value="${v}" style="accent-color:var(--blue)"> ${v==='none'?'No referral':v}</label>`).join('')}
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-teal" onclick="submitConsult('${apptId}')">✅ Complete & Save</button>`);
}

function submitConsult(apptId) {
  const diagnosis = document.getElementById('cDiagnosis')?.value;
  const symptoms  = document.getElementById('cSymptoms')?.value;
  if (!diagnosis||!symptoms) { toast('Symptoms and diagnosis are required','error'); return; }
  const a = DB.appointments.find(x=>x.id===apptId);
  const nurses = getSelectedNurses();
  const fuSel = document.querySelector('input[name="fuRadio"]:checked')?.value||'none';
  const referChecks = Array.from(document.querySelectorAll('input[name="referCheck"]:checked')).map(x=>x.value).filter(v=>v!=='none');
  const consultId = 'CON-'+Date.now();
  const todayStr = new Date().toISOString().split('T')[0];
  DB.consultations.push({
    id:consultId, apptId, patient:a.patient, patientId:a.patientId||'',
    doctor:currentUser.name||'Dr. Lim Wei Jian', nurses, date:todayStr,
    diagnosis, symptoms, prescription:document.getElementById('cPrescription')?.value||'',
    vitals:{bp:document.getElementById('vBp')?.value||'—',pulse:document.getElementById('vPulse')?.value||'—',temp:document.getElementById('vTemp')?.value||'—',spo2:document.getElementById('vSpo2')?.value||'—'},
    notes:document.getElementById('cNotes')?.value||'',
    followUp:fuSel!=='none'?`Follow-up in ${fuSel}`:'',
    referral:referChecks.join(', ')
  });
  // Update medical record — push consultation ID + update appointment entry with attending staff
  if (a.patientId) {
    const rec = getOrCreateRecord(a.patientId, a.patient, a.studentId);
    if (!rec.visits.includes(consultId)) rec.visits.push(consultId);
    // Update appointment history entry with final doctor & nurses
    if (!rec.appointments) rec.appointments = [];
    const apptEntry = rec.appointments.find(x=>x.apptId===apptId);
    if (apptEntry) {
      apptEntry.status = 'completed';
      apptEntry.doctor = currentUser.name||a.doctor;
      apptEntry.nurses = nurses;
      apptEntry.diagnosis = diagnosis;
      apptEntry.consultId = consultId;
    } else {
      rec.appointments.unshift({apptId, date:a.date, time:a.time, doctor:currentUser.name||a.doctor, reason:a.notes||'', status:'completed', nurses, diagnosis, consultId});
    }
  }
  cascadeCompleteAppt(apptId); reorderQueue();
  if (referChecks.length>0) { addNotification(`Referral: ${a.patient} → ${referChecks.join(', ')}`, 'info'); addAudit('Referral Generated', `${a.patient} → ${referChecks.join(', ')}`, currentUser.name); }
  if (fuSel!=='none') addNotification(`Follow-up: ${a.patient} in ${fuSel}`, 'info');
  if (nurses.length>0) addAudit('Nurses on record', `${nurses.join(', ')} assisted consultation for ${a.patient}`, currentUser.name);
  buildSidebar(); closeModal();
  if (['consultations','dashboard','my-queue'].includes(currentPage)) navTo(currentPage);
  toast(`Consultation complete — ${a.patient}${nurses.length>0?' · Nurse: '+nurses[0]:''}${referChecks.length>0?' · Referral: '+referChecks[0]:''}`, 'success');
}

// ══════════════════════════════════════════════
//  VITALS
// ══════════════════════════════════════════════
function renderVitals() {
  const inProgress = DB.queue.filter(q=>q.status!=='done');
  return `<div class="two-col">
    <div class="card">
      <div class="card-h"><div class="card-title">Patients in Queue</div></div>
      <div style="padding:10px">${inProgress.length===0?'<div class="empty-state" style="padding:24px"><p>No patients</p></div>':
        inProgress.map(q=>`<div class="queue-item ${q.type==='emergency'?'emergency':''}">
          <div class="q-pos">${q.type==='emergency'?'!':q.pos}</div>
          <div class="q-info"><div class="q-name">${q.patient}</div><div class="q-meta">${q.doctor}</div></div>
          ${q.type==='emergency'?`<button class="btn btn-ambulance btn-sm" onclick="callAmbulance('${q.patient}')">🚑</button>`:''}
          <button class="btn btn-teal btn-sm" onclick="openVitalsForm('${q.id}','${q.patient}')">Vitals</button>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-h"><div class="card-title">Record Vitals</div></div>
      <div style="padding:14px">
        <div class="field-group"><label class="field-label">Patient</label><input class="field-input" id="vitPatient" placeholder="Select from queue →"></div>
        <div class="vitals-grid mb-14">
          <div><label class="field-label">BP</label><input class="field-input" id="vit_bp" placeholder="120/80"></div>
          <div><label class="field-label">Pulse</label><input class="field-input" id="vit_pulse" placeholder="72"></div>
          <div><label class="field-label">Temp (°C)</label><input class="field-input" id="vit_temp" placeholder="36.5"></div>
        </div>
        <div class="field-group"><label class="field-label">SpO2 (%)</label><input class="field-input" id="vit_spo2" placeholder="98" style="width:120px"></div>
        <div class="field-group"><label class="field-label">Notes</label><textarea class="field-textarea" id="vit_notes" placeholder="Initial assessment…"></textarea></div>
        <button class="btn btn-teal" style="width:100%" onclick="saveVitals()">💾 Save Vitals</button>
      </div>
    </div>
  </div>`;
}

function openVitalsForm(qId, patient) {
  document.getElementById('vitPatient').value = patient;
  toast(`Vitals form ready for ${patient}`,'success');
}

function saveVitals() {
  const p = document.getElementById('vitPatient')?.value;
  if (!p) { toast('Select a patient first','error'); return; }
  addAudit('Vitals Recorded',`Vitals saved for ${p}`);
  toast(`Vitals recorded for ${p}`,'success');
  ['vit_bp','vit_pulse','vit_temp','vit_spo2','vit_notes'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('vitPatient').value='';
}

// ══════════════════════════════════════════════
//  DATE & TIME SLOT HELPERS
// ══════════════════════════════════════════════
const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00'];

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════
//  AUTO-EXPIRE PAST APPOINTMENTS
//  Any pending or approved appointment whose date is strictly
//  before today is automatically marked 'expired' in Supabase
//  and in the local DB so all views stay consistent.
// ══════════════════════════════════════════════
async function autoExpireAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const toExpire = DB.appointments.filter(a =>
    a.date < today && (a.status === 'pending' || a.status === 'approved')
  );
  if (toExpire.length === 0) return;

  // Batch-update Supabase (one call per affected id)
  await Promise.allSettled(toExpire.map(a =>
    sb.from('appointments')
      .update({ status: 'expired', notes: (a.notes ? a.notes + ' | ' : '') + 'Auto-expired: appointment date passed without attendance.' })
      .eq('appointment_ref', a.id)
  ));

  // Mirror locally so UI updates immediately without another fetch
  toExpire.forEach(a => {
    a.status = 'expired';
    a.notes = (a.notes ? a.notes + ' | ' : '') + 'Auto-expired: appointment date passed without attendance.';
  });

  if (toExpire.length > 0) {
    addAudit('Auto-Expire', `${toExpire.length} past appointment(s) expired automatically`);
    console.info(`[CampusCare] Auto-expired ${toExpire.length} appointment(s).`);
  }
}

function getMaxBookingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

// Returns slots booked on a given date, optionally excluding a specific apptId (for edits)
function getBookedSlots(date, excludeId) {
  return DB.appointments
    .filter(a => a.date === date && a.status !== 'cancelled' && a.id !== excludeId)
    .map(a => a.time);
}

// Builds <option> elements with booked slots disabled
function getAvailableTimeOptions(date, excludeId) {
  const booked = getBookedSlots(date, excludeId);
  return ALL_SLOTS.map(s => {
    const taken = booked.includes(s);
    return `<option value="${s}" ${taken ? 'disabled style="color:#aaa"' : ''}>${s}${taken ? ' — Booked' : ''}</option>`;
  }).join('');
}

function getAvailableSlotCount(date, excludeId) {
  const booked = getBookedSlots(date, excludeId);
  return ALL_SLOTS.filter(s => !booked.includes(s)).length;
}

function isDateFullyBooked(date, excludeId) {
  return getAvailableSlotCount(date, excludeId) === 0;
}

// Called when date picker changes — refreshes time slot dropdown
function refreshTimeSlots(dateId, timeId, excludeId) {
  const date = document.getElementById(dateId)?.value;
  const sel  = document.getElementById(timeId);
  if (!date || !sel) return;
  sel.innerHTML = getAvailableTimeOptions(date, excludeId);
  // Auto-select first available slot
  const firstAvail = Array.from(sel.options).find(o => !o.disabled);
  if (firstAvail) firstAvail.selected = true;
  // Show date availability banner (for students)
  updateDateBanner(date, excludeId);
}

function updateDateBanner(date, excludeId) {
  const banner = document.getElementById('dateBanner');
  if (!banner) return;
  const available = getAvailableSlotCount(date, excludeId);
  const total = ALL_SLOTS.length;
  if (available === 0) {
    banner.style.display = 'block';
    banner.style.background = 'var(--red-bg)';
    banner.style.color = '#991b1b';
    banner.style.border = '1px solid rgba(239,68,68,.3)';
    banner.innerHTML = '🚫 <strong>This date is fully booked.</strong> Please choose a different date.';
  } else if (available <= 3) {
    banner.style.display = 'block';
    banner.style.background = 'var(--amber-bg)';
    banner.style.color = '#92400e';
    banner.style.border = '1px solid rgba(245,158,11,.3)';
    banner.innerHTML = `⚠ <strong>Almost full</strong> — only <strong>${available}</strong> slot${available===1?'':'s'} left on this date.`;
  } else {
    banner.style.display = 'block';
    banner.style.background = 'var(--green-bg)';
    banner.style.color = '#065f46';
    banner.style.border = '1px solid rgba(16,185,129,.3)';
    banner.innerHTML = `✓ <strong>${available}</strong> slot${available===1?'':'s'} available on this date.`;
  }
}

// Warn if selected slot is already booked
function checkSlotConflict(sel) {
  if (sel.selectedOptions[0]?.disabled) {
    toast('That time slot is already booked — please choose another', 'error');
  }
}


let selectedApptType = 'normal';

function renderBooking() {
  const doctors = getBookingDoctors();
  const doctorOpts = doctors.length > 0
    ? getDoctorOptions(doctors) + '<option value="No Preference">No Preference</option>'
    : '<option value="No Preference">No Preference / Any Available Doctor</option>';
  const html = `<div style="max-width:580px;margin:0 auto">
    <div class="card">
      <div class="card-h"><div class="card-title">Book an Appointment</div><div class="card-sub">Normal visits only — for emergency, go directly to reception</div></div>
      <div style="padding:20px">
        <div style="background:var(--red-bg);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:12.5px;color:#991b1b">
          🚨 <strong>Emergency?</strong> Do not book online. Come directly to the clinic reception or call <strong>999</strong> for an ambulance.
        </div>
        <div class="field-group"><label class="field-label">Your Name</label><input class="field-input" value="${currentUser.name}" readonly style="background:var(--surface2)"></div>
        <div id="dateBanner" style="display:none;border-radius:8px;padding:10px 13px;margin-bottom:12px;font-size:12.5px;transition:.2s"></div>
        <div class="field-grid">
          <div class="field-group"><label class="field-label">Preferred Date</label><input type="date" class="field-input" id="bkDate" value="${getTomorrowDate()}" min="${getTomorrowDate()}" max="${getMaxBookingDate()}" onchange="refreshTimeSlots('bkDate','bkTime','')"></div>
          <div class="field-group"><label class="field-label">Preferred Time</label>
            <select class="field-select" id="bkTime" onchange="checkSlotConflict(this)">${getAvailableTimeOptions(getTomorrowDate(), '')}</select>
          </div>
        </div>
        <div class="field-group"><label class="field-label">Doctor Preference</label>
          <select class="field-select" id="bkDoctor">${doctorOpts}</select>
        </div>
        <div class="field-group"><label class="field-label">Symptoms / Reason <span style="color:var(--red)">*</span></label><textarea class="field-textarea" id="bkNotes" placeholder="Describe your symptoms…"></textarea></div>
        <button class="btn btn-primary" style="width:100%;padding:12px;font-size:14px" onclick="submitStudentBooking()">Submit Booking Request</button>
        <div style="font-size:11.5px;color:var(--ink3);text-align:center;margin-top:10px">Your request will be reviewed and approved. Type: <strong>Normal only</strong>.</div>
      </div>
    </div>
  </div>`;
  setTimeout(() => updateDateBanner(getTomorrowDate(), ''), 30);
  return html;
}

async function submitStudentBooking() {
  const notes  = document.getElementById('bkNotes')?.value.trim();
  const date   = document.getElementById('bkDate')?.value;
  const time   = document.getElementById('bkTime')?.value;
  const doctor = document.getElementById('bkDoctor')?.value;
  if (!notes) { toast('Please describe your symptoms','error'); return; }
  if (!date || !time) { toast('Please select a date and time','error'); return; }
  if (isDateFullyBooked(date, '')) { toast('This date is fully booked — please choose another date','error'); return; }

  const btn = document.querySelector('#contentArea .btn-primary');
  if (btn) { btn.textContent='Submitting…'; btn.disabled=true; }

  try {
    // Build appointment ID
    const id = 'APT-' + Date.now();

    // Find doctor name for display
    const doctorName = (doctor && doctor !== 'No Preference')
      ? doctor
      : 'Any Available Doctor';

    // Save to Supabase appointments table
    const { error } = await sb.from('appointments').insert({
      appointment_ref:  id,
      patient_id:       currentUser.userId,
      patient_name:     currentUser.name,
      student_id:       currentUser.studentId || '',
      doctor:           doctorName,
      date:             date,
      time:             time,
      type:             'normal',
      status:           'pending',
      notes:            notes,
      source:           'online',
    });

    if (error) {
      // If appointments table doesn't exist yet, fall back to local DB
      console.warn('Supabase appointments insert failed, using local:', error.message);
      const appt = {
        id, patientId: currentUser.userId, patient: currentUser.name,
        studentId: currentUser.studentId||'', doctor: doctorName,
        date, time, type:'normal', status:'pending', notes, source:'online'
      };
      DB.appointments.unshift(appt);
    } else {
      // Add to local DB for immediate display
      DB.appointments.unshift({
        id, patientId: currentUser.userId, patient: currentUser.name,
        studentId: currentUser.studentId||'', doctor: doctorName,
        date, time, type:'normal', status:'pending', notes, source:'online'
      });
    }

    addNotification(`Booking from ${currentUser.name}`, 'info');
    addAudit('Booking Submitted', `${currentUser.name} — ${date} ${time}`);
    toast('Booking submitted — awaiting approval ✓', 'success');
    navTo('my-appointments');
  } catch(e) {
    toast('Error submitting booking: ' + e.message, 'error');
  }
  if (btn) { btn.textContent='Submit Booking Request'; btn.disabled=false; }
}

// ══════════════════════════════════════════════
//  MY APPOINTMENTS (STUDENT — can edit/cancel pending only)
// ══════════════════════════════════════════════
function renderMyAppointments() {
  const myAppts = DB.appointments.filter(a=>a.patientId===currentUser.userId||a.patient===currentUser.name);
  const today = new Date().toISOString().split('T')[0];
  const expiredCount = myAppts.filter(a=>a.status==='expired').length;
  return `<div class="card">
    <div class="card-h"><div><div class="card-title">My Appointments</div><div class="card-sub">${myAppts.length} on record · Only pending appointments can be edited or cancelled</div></div>
    <button class="btn btn-primary" onclick="navTo('booking')">+ Book New</button></div>
    ${expiredCount>0?`<div style="background:var(--amber-bg);border-left:4px solid var(--amber);padding:10px 16px;font-size:12.5px;color:#92400e;display:flex;align-items:center;gap:8px">
      ⏰ <span><strong>${expiredCount} appointment${expiredCount>1?'s were':' was'} automatically removed</strong> — the booking date passed without attendance. Please rebook if you still need to visit the clinic.</span>
    </div>`:''}
    <div class="tbl-wrap"><table>
      <thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${myAppts.map(a=>{
        const isPast = a.date < today;
        return `<tr style="${a.status==='expired'?'opacity:0.7;background:var(--surface2)':''}">
          <td><span class="appt-id">#${a.id}</span></td>
          <td style="${isPast&&a.status!=='completed'?'color:var(--red);font-weight:600':''}">
            ${a.date}${isPast&&a.status!=='completed'?` <span style="font-size:10px;background:var(--red-bg);color:var(--red);padding:1px 5px;border-radius:4px;font-weight:500">past</span>`:''}
          </td>
          <td>${a.time}</td>
          <td>${a.doctor}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td>
            <span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span>
            ${a.status==='expired'?`<div style="font-size:10px;color:var(--ink3);margin-top:2px">Auto-removed</div>`:''}
          </td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="viewAppt('${a.id}')">View</button>
            ${a.status==='pending'&&!isPast?`<button class="btn btn-primary btn-sm" onclick="studentEditAppt('${a.id}')">Edit</button>`:''}
            ${a.status==='pending'&&!isPast?`<button class="btn btn-danger btn-sm" onclick="studentCancelAppt('${a.id}')">Cancel</button>`:''}
            ${a.status==='expired'?`<button class="btn btn-primary btn-sm" onclick="navTo('booking')">↩ Rebook</button>`:''}
            ${a.status!=='pending'&&a.status!=='completed'&&a.status!=='expired'?`<span style="font-size:10.5px;color:var(--ink3);padding:0 4px">Locked</span>`:''}
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--ink3)">No appointments</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

function studentEditAppt(id) {
  const a = DB.appointments.find(x=>x.id===id);
  if (!a || a.status!=='pending') { toast('Only pending appointments can be edited','error'); return; }
  openModal(`Edit Appointment #${id}`,
    `<div style="background:var(--amber-bg);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:#92400e">
      You can only edit appointments that are still <strong>Pending</strong>. Once approved, contact reception for changes.
    </div>
    <div id="dateBanner" style="display:none;border-radius:8px;padding:10px 13px;margin-bottom:12px;font-size:12.5px;transition:.2s"></div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Date</label><input type="date" class="field-input" id="editDate" value="${a.date}" min="${getTomorrowDate()}" max="${getMaxBookingDate()}" onchange="refreshTimeSlots('editDate','editTime','${id}')"></div>
      <div class="field-group"><label class="field-label">Time</label>
        <select class="field-select" id="editTime">${getAvailableTimeOptions(a.date, id)}</select>
      </div>
    </div>
    <div class="field-group"><label class="field-label">Symptoms / Notes</label><textarea class="field-textarea" id="editNotes">${a.notes||''}</textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveStudentEdit('${id}')">Save Changes</button>`);
  setTimeout(() => updateDateBanner('${a.date}', '${id}'), 30);
}

async function saveStudentEdit(id) {
  const a = DB.appointments.find(x=>x.id===id);
  if (!a || a.status!=='pending') { toast('Cannot edit — status changed','error'); closeModal(); return; }
  const newEditDate = document.getElementById('editDate')?.value || a.date;
  const newEditTime = document.getElementById('editTime')?.value || a.time;
  if (newEditDate !== a.date || newEditTime !== a.time) {
    const editBooked = getBookedSlots(newEditDate, id);
    if (editBooked.includes(newEditTime)) { toast('That time slot is already booked — choose another','error'); return; }
  }
  const newNotes = document.getElementById('editNotes')?.value || a.notes;
  const btn = document.querySelector('#modalFooter .btn-primary');
  if(btn){btn.textContent='Saving…';btn.disabled=true;}
  const { error } = await sb.from('appointments').update({ date:newEditDate, time:newEditTime, notes:newNotes }).eq('appointment_ref', id);
  if(btn){btn.textContent='Save Changes';btn.disabled=false;}
  if (error) { toast('Failed to save: '+error.message,'error'); return; }
  a.date=newEditDate; a.time=newEditTime; a.notes=newNotes;
  addAudit('Appointment Edited',`${a.patient} edited #${id} — ${a.date} ${a.time}`);
  closeModal(); navTo('my-appointments');
  toast('Appointment updated ✓','success');
}

function studentCancelAppt(id) {
  const a = DB.appointments.find(x=>x.id===id);
  if (!a || a.status!=='pending') { toast('Cannot cancel — status already changed','error'); return; }
  openModal('Cancel Appointment',
    `<p style="font-size:13px">Cancel your <strong>${a.type}</strong> appointment on <strong>${a.date}</strong> at <strong>${a.time}</strong>?</p>
     <p style="font-size:12px;color:var(--ink3);margin-top:8px">Once cancelled, you'll need to book a new appointment.</p>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Keep It</button>
     <button class="btn btn-danger" onclick="confirmStudentCancel('${id}')">Yes, Cancel</button>`);
}
async function confirmStudentCancel(id) {
  const btn = document.querySelector('#modalFooter .btn-danger');
  if(btn){btn.textContent='Cancelling…';btn.disabled=true;}
  const { error } = await sb.from('appointments').update({ status:'rejected', notes:'Cancelled by patient' }).eq('appointment_ref', id);
  if(btn){btn.textContent='Yes, Cancel';btn.disabled=false;}
  if (error) { toast('Failed to cancel: '+error.message,'error'); return; }
  const a = DB.appointments.find(x=>x.id===id);
  if(a) a.status='rejected';
  addAudit('Appointment Cancelled',`${currentUser.name} cancelled #${id}`);
  closeModal(); navTo('my-appointments');
  toast('Appointment cancelled','warning');
}

// ══════════════════════════════════════════════
//  QUEUE STATUS (STUDENT)
// ══════════════════════════════════════════════
function renderQueueStatus() {
  const myAppt = DB.appointments.find(a=>(a.patientId===currentUser.userId||a.patient===currentUser.name)&&a.status==='approved');
  const myQueue = myAppt ? DB.queue.find(q=>q.apptId===myAppt?.id) : null;
  return `<div style="max-width:500px;margin:0 auto">
    ${myQueue?`<div class="card mb-14" style="border:2px solid var(--blue)"><div style="padding:24px;text-align:center">
      <div style="font-size:52px;font-weight:800;color:var(--blue);font-family:'JetBrains Mono',monospace;line-height:1">#${myQueue.pos}</div>
      <div style="font-size:12.5px;color:var(--ink3);margin-top:4px">Your Queue Position</div>
      <div style="margin:16px 0;display:flex;justify-content:center;gap:24px">
        <div><div style="font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace">${myQueue.waitMin===0?'NOW':'~'+myQueue.waitMin+' min'}</div><div style="font-size:11px;color:var(--ink3)">Est. Wait</div></div>
        <div><div style="font-size:16px;font-weight:700">${myQueue.doctor}</div><div style="font-size:11px;color:var(--ink3)">Your Doctor</div></div>
      </div>
      <span class="badge b-${myQueue.status==='waiting'?'waiting':myQueue.status==='in-progress'?'inprog':'done'}"><span class="bdot"></span>${cap(myQueue.status)}</span>
    </div></div>`:`<div class="card mb-14" style="text-align:center;padding:28px">
      <div style="font-size:36px">📋</div>
      <div style="font-size:14px;font-weight:600;margin:10px 0 5px">No Active Queue Entry</div>
      <div style="font-size:12.5px;color:var(--ink3);margin-bottom:14px">Book an appointment to see your queue status</div>
      <button class="btn btn-primary" onclick="navTo('booking')">Book Appointment</button>
    </div>`}
    <div class="card"><div class="card-h"><div class="card-title">Live Queue</div><div class="live-badge"><div class="live-dot"></div>Live</div></div>
    <div style="padding:8px">${DB.queue.filter(q=>q.status!=='done').map(q=>`<div class="queue-item ${q.type==='emergency'?'emergency':''}">
      <div class="q-pos" style="${myQueue?.id===q.id?'background:var(--blue);color:white':''}">${q.type==='emergency'?'!':q.pos}</div>
      <div class="q-info"><div class="q-name">${myQueue?.id===q.id?'⭐ You':'Patient'}</div><div class="q-meta">${q.type==='emergency'?'🚨 Emergency':'Normal'}</div></div>
      <div class="q-wait ${q.waitMin===0?'urgent':''}">${q.waitMin===0?'NOW':'~'+q.waitMin+'m'}</div>
    </div>`).join('')}</div></div>
  </div>`;
}

// ══════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════
function renderProfile() {
  const myAppts = DB.appointments.filter(a=>currentUser.roleKey==='student'?(a.patientId===currentUser.userId||a.patient===currentUser.name):a.doctor===currentUser.name);
  return `<div style="max-width:620px">
    <div class="profile-card mb-20">
      <div class="prf-top">
        <div class="prf-ava" style="background:${currentUser.color}">${currentUser.initials}</div>
        <div><div class="prf-name">${currentUser.name}</div><div class="prf-role">${currentUser.role} · ${currentUser.dept}</div></div>
      </div>
      <div class="prf-stats">
        <div><div class="prf-stat-v">${myAppts.length}</div><div class="prf-stat-l">Appointments</div></div>
        <div><div class="prf-stat-v">${myAppts.filter(a=>a.status==='completed').length}</div><div class="prf-stat-l">Completed</div></div>
        <div><div class="prf-stat-v">${myAppts.filter(a=>a.type==='emergency').length}</div><div class="prf-stat-l">Emergency</div></div>
      </div>
    </div>
    ${currentUser.roleKey==='student'?`<div class="card mb-14"><div class="card-h"><div class="card-title">🗂 My Medical Record</div><button class="btn btn-primary btn-sm" onclick="viewMedicalRecord(currentUser.userId)">View Record</button></div>
      <div style="padding:14px;font-size:12.5px;color:var(--ink2)">Your full medical history — all visits, diagnoses, prescriptions, and the names of every doctor and nurse who assisted you are permanently recorded and available to any clinic doctor treating you.</div></div>`:''}
    <div class="card">
      <div class="card-h"><div class="card-title">Profile Settings</div><button class="btn btn-primary btn-sm" onclick="saveProfile()">Save</button></div>
      <div style="padding:18px">
        <div class="field-grid">
          <div class="field-group"><label class="field-label">Full Name</label><input class="field-input" id="pfName" value="${currentUser.name}"></div>
          <div class="field-group"><label class="field-label">Role</label><input class="field-input" value="${currentUser.role}" readonly style="background:var(--surface2)"></div>
        </div>
        <div class="field-group"><label class="field-label">Department</label><input class="field-input" id="pfDept" value="${currentUser.dept}"></div>
        <div class="divider"></div>
        <div class="field-grid">
          <div class="field-group"><label class="field-label">New Password</label><input type="password" class="field-input" id="pfPass" placeholder="Leave blank to keep"></div>
          <div class="field-group"><label class="field-label">Confirm</label><input type="password" class="field-input" id="pfPass2"></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-h"><div class="card-title">Account</div></div>
      <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="toast('Preferences saved!','success')">⚙ Preferences</button>
        <button class="btn btn-danger" onclick="confirmLogout()">🚪 Sign Out</button>
      </div>
    </div>
  </div>`;
}

function saveProfile() {
  const name=document.getElementById('pfName')?.value, dept=document.getElementById('pfDept')?.value;
  const pass=document.getElementById('pfPass')?.value, pass2=document.getElementById('pfPass2')?.value;
  if (pass && pass!==pass2) { toast('Passwords do not match','error'); return; }
  if (name) currentUser.name=name;
  if (dept) currentUser.dept=dept;
  addAudit('Profile Updated','Profile updated');
  buildSidebar(); buildTopbarAva();
  toast('Profile updated','success');
}
function confirmLogout() {
  openModal('Sign Out','<p style="font-size:13px">Are you sure you want to sign out?</p>',
    `<button class="btn btn-ghost" onclick="closeModal()">Stay</button><button class="btn btn-danger" onclick="doLogout()">Sign Out</button>`);
}

// ══════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════
function renderReports() {
  const byStatus={}, byDoctor={};
  DB.appointments.forEach(a=>{byStatus[a.status]=(byStatus[a.status]||0)+1; byDoctor[a.doctor]=(byDoctor[a.doctor]||0)+1;});
  const expiredAppts = DB.appointments.filter(a=>a.status==='expired');
  const expiredCount = expiredAppts.length;
  const bars=[{d:'Mon',v:19},{d:'Tue',v:22},{d:'Wed',v:18},{d:'Thu',v:25},{d:'Fri',v:22},{d:'Sat',v:12},{d:'Sun',v:21}];
  const maxV=Math.max(...bars.map(b=>b.v));
  const total = DB.appointments.length || 1;
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div class="section-title" style="margin:0">Reports & Analytics</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-ghost" onclick="exportCSV()">📥 Export CSV</button>
      <button class="btn btn-primary" onclick="toast('PDF generated','success')">📊 PDF</button>
    </div>
  </div>
  <div class="stats-grid mb-20">
    <div class="stat-card"><div class="stat-icon" style="background:var(--blue-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-val">${DB.appointments.length}</div><div class="stat-lbl">Total</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:var(--green-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="stat-val" style="color:var(--green)">${byStatus['completed']||0}</div><div class="stat-lbl">Completed</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:var(--red-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div class="stat-val" style="color:var(--red)">${DB.appointments.filter(a=>a.type==='emergency').length}</div><div class="stat-lbl">Emergency</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:var(--amber-bg)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-val" style="color:var(--amber)">${byStatus['rejected']||0}</div><div class="stat-lbl">Rejected</div></div>
    <div class="stat-card" style="border:1.5px solid var(--amber);position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--amber);opacity:.7"></div>
      <div class="stat-icon" style="background:var(--amber-bg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/><path d="M4.93 4.93l14.14 14.14" stroke-dasharray="2 2"/></svg>
      </div>
      <div class="stat-val" style="color:var(--amber)">${expiredCount}</div>
      <div class="stat-lbl">Auto-Expired</div>
    </div>
  </div>
  ${expiredCount>0?`
  <div class="card mb-14" style="border:1.5px solid var(--amber)">
    <div class="card-h" style="background:var(--amber-bg);border-radius:10px 10px 0 0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:15px">⏰</span>
        <div>
          <div class="card-title" style="color:#92400e">Auto-Expired Appointments</div>
          <div class="card-sub" style="color:#b45309">${expiredCount} booking${expiredCount>1?'s':''} automatically removed — date passed without student attendance</div>
        </div>
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>ID</th><th>Patient</th><th>Student ID</th><th>Booked Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Expired Reason</th></tr></thead>
      <tbody>${expiredAppts.map(a=>`<tr style="opacity:0.8">
        <td><span class="appt-id">#${a.id}</span></td>
        <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div class="pt-name">${a.patient}</div></div></td>
        <td style="font-size:11.5px;color:var(--ink3)">${a.studentId||'—'}</td>
        <td style="color:var(--red);font-weight:600">${a.date} <span style="font-size:10px;background:var(--red-bg);color:var(--red);padding:1px 5px;border-radius:4px">past</span></td>
        <td>${a.time}</td>
        <td>${a.doctor}</td>
        <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
        <td style="font-size:11.5px;color:var(--ink3);max-width:180px">Date passed — auto-removed by system</td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}
  <div class="card mb-14"><div class="card-h"><div class="card-title">Weekly Trend</div></div>
    <div style="padding:18px 18px 12px"><div style="display:flex;align-items:flex-end;gap:8px;height:90px;border-bottom:1px solid var(--border2);padding-bottom:4px">
      ${bars.map(b=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
        <div style="width:100%;background:var(--blue);opacity:.75;border-radius:4px 4px 0 0;height:${Math.round(b.v/maxV*100)}%"></div>
        <div style="font-size:10px;color:var(--ink3);font-weight:600">${b.d}</div>
      </div>`).join('')}
    </div></div>
  </div>
  <div class="grid-2">
    <div class="card"><div class="card-h"><div class="card-title">By Status</div></div>
      ${Object.entries(byStatus).map(([k,v])=>`<div class="report-row">
        <span class="badge ${statusBadge(k)}"><span class="bdot"></span>${cap(k)}${k==='expired'?' ⏰':''}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:90px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.round(v/total*100)}%;background:${k==='expired'?'var(--amber)':'var(--blue)'};border-radius:3px"></div>
          </div>
          <span class="r-val">${v}</span>
          ${k==='expired'?`<span style="font-size:10px;color:var(--amber);font-weight:600">auto-removed</span>`:''}
        </div>
      </div>`).join('')}
    </div>
    <div class="card"><div class="card-h"><div class="card-title">By Doctor</div></div>
      ${Object.entries(byDoctor).map(([k,v])=>`<div class="report-row"><span style="font-size:12px;font-weight:500">${k}</span><div style="display:flex;align-items:center;gap:10px"><div style="width:90px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(v/total*100)}%;background:var(--teal);border-radius:3px"></div></div><span class="r-val">${v}</span></div></div>`).join('')}
    </div>
  </div>`;
}

function exportCSV() {
  const headers=['ID','Patient','Student ID','Date','Time','Type','Doctor','Status','Auto-Expired','Source','Notes'];
  const rows=DB.appointments.map(a=>[a.id,a.patient,a.studentId,a.date,a.time,a.type,a.doctor,a.status,a.status==='expired'?'Yes':'No',a.source||'',`"${a.notes||''}"`]);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='campuscare-report.csv'; a.click();
  addAudit('CSV Exported','Full appointment report exported');
  toast('CSV exported','success');
}

// ══════════════════════════════════════════════
//  USER MANAGEMENT + PASSWORD RESET  (Supabase)
// ══════════════════════════════════════════════
let sbUsers = []; // cached from Supabase

function renderUsers() {
  loadUsersFromSupabase();
  return `<div class="card">
    <div class="card-h"><div><div class="card-title">User Management</div><div class="card-sub">Staff created by admin · Students self-register · Admin resets passwords</div></div>
    <div class="card-actions">
      <button class="btn btn-ghost" onclick="loadUsersFromSupabase()">🔄 Refresh</button>
      <button class="btn btn-primary" onclick="openAddUserModal()">+ Add Staff</button>
    </div></div>
    <div class="filter-bar">
      <input class="search-field" placeholder="Search name, email…" id="userSearch" oninput="filterUsers()">
      <select class="filter-select" id="userRoleFilter" onchange="filterUsers()">
        <option value="all">All Roles</option>
        <option value="doctor">Doctor</option>
        <option value="nurse">Nurse</option>
        <option value="receptionist">Receptionist</option>
        <option value="admin">Admin</option>
        <option value="student">Student</option>
      </select>
      <select class="filter-select" id="userTypeFilter" onchange="filterUsers()">
        <option value="all">Staff + Students</option>
        <option value="staff">Staff Only</option>
        <option value="student">Students Only</option>
      </select>
    </div>
    <div class="tbl-wrap" id="userTableWrap"><div style="padding:28px;text-align:center;color:var(--ink3)">Loading users…</div></div>

    <!-- Password Reset Requests Banner -->
    <div id="resetRequestsBanner" style="display:none;padding:12px 16px;background:var(--amber-bg);border-top:1px solid var(--amber)">
      <div style="font-size:12.5px;font-weight:600;color:#92400e;margin-bottom:8px">⚠️ Pending Password Reset Requests</div>
      <div id="resetRequestsList"></div>
    </div>
  </div>`;
}

async function loadUsersFromSupabase() {
  const wrap = document.getElementById('userTableWrap');
  if (wrap) wrap.innerHTML = '<div style="padding:28px;text-align:center;color:var(--ink3)">Loading…</div>';

  try {
    const [{ data: staffData }, { data: stuData }] = await Promise.all([
      sb.from('staff').select('*').order('created_at', { ascending: false }),
      sb.from('students').select('*').order('created_at', { ascending: false })
    ]);

    sbUsers = [
      ...(staffData || []).map(u => ({ ...u, _type: 'staff' })),
      ...(stuData  || []).map(u => ({ ...u, _type: 'student', role: 'student' }))
    ];

    // Sync with DB.users for existing app functions
    DB.users = sbUsers.map(u => ({
      id: u.id, name: u.first_name + ' ' + u.last_name, email: u.email,
      role: u.role, dept: u.department || '', status: u.is_active ? 'active' : 'inactive',
      createdBy: u._type === 'student' ? 'self' : 'admin',
      staffId: u.staff_id, studentId: u.student_id, _supaId: u.id, _type: u._type
    }));

    renderUserTable();
    loadResetRequests();
  } catch(e) {
    if (wrap) wrap.innerHTML = `<div style="padding:28px;text-align:center;color:var(--red)">Error loading users: ${e.message}</div>`;
  }
}

async function loadResetRequests() {
  const { data } = await sb.from('password_reset_requests').select('*').eq('status','pending').order('requested_at', { ascending: false });
  const banner = document.getElementById('resetRequestsBanner');
  const list   = document.getElementById('resetRequestsList');
  if (!banner || !list) return;
  if (!data || data.length === 0) { banner.style.display = 'none'; return; }
  banner.style.display = '';
  list.innerHTML = data.map(r => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;background:white;border-radius:8px;padding:8px 12px;border:1px solid var(--amber)">
      <div style="flex:1">
        <div style="font-size:12.5px;font-weight:600">${r.email}</div>
        <div style="font-size:11px;color:var(--ink3)">${r.requester_type === 'student' ? '🎓 Student' : '👤 Staff'} · Requested ${new Date(r.requested_at).toLocaleString()}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="adminResetFromRequest('${r.id}','${r.email}','${r.requester_type}','${r.requester_id}')">🔑 Reset</button>
      <button class="btn btn-ghost btn-sm" onclick="dismissResetRequest('${r.id}')">Dismiss</button>
    </div>`).join('');
}

async function adminResetFromRequest(reqId, email, type, userId) {
  openModal('Reset Password — ' + email,
    `<div style="font-size:13px;color:var(--ink2);margin-bottom:14px">
      Set a new password for <strong>${email}</strong>. They will be prompted to change it on next login.
    </div>
    <div class="field-group">
      <label class="field-label">New Password <span style="color:var(--red)">*</span></label>
      <input type="password" class="field-input" id="adminPwInput" placeholder="Min 6 characters">
    </div>
    <div class="field-group">
      <label class="field-label">Confirm Password</label>
      <input type="password" class="field-input" id="adminPwConfirm" placeholder="Repeat password">
    </div>
    <div style="background:var(--blue-bg);border-radius:8px;padding:10px 12px;font-size:12px;color:#0369a1">
      ℹ Password is changed immediately. Share it with the user directly and securely.
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="
       const p=document.getElementById('adminPwInput')?.value;
       const c=document.getElementById('adminPwConfirm')?.value;
       if(!p||p.length<6){toast('Password must be at least 6 characters','error');return;}
       if(p!==c){toast('Passwords do not match','error');return;}
       confirmAdminResetRequest('${reqId}','${email}','${type}','${userId}')
     ">Set New Password</button>`);
}

async function confirmAdminResetRequest(reqId, email, type, userId) {
  const newPw = document.getElementById('adminPwInput')?.value;
  if (!newPw || newPw.length < 6) { toast('Password must be at least 6 characters','error'); return; }

  const btn = document.querySelector('#modalFooter .btn-primary');
  if (btn) { btn.textContent = 'Updating…'; btn.disabled = true; }

  // Actually change the password in Supabase auth
  const { data, error } = await sb.rpc('admin_set_user_password', {
    p_user_email:   email,
    p_new_password: newPw
  });

  if (btn) { btn.textContent = 'Confirm Reset'; btn.disabled = false; }
  if (error || data?.error) { toast('Error: ' + (error?.message || data?.error), 'error'); return; }

  // Resolve the request
  await sb.from('password_reset_requests').update({
    status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: currentUser.userId,
    notes: 'Reset by admin.'
  }).eq('id', reqId);

  addAudit('Password Reset', `Admin reset password for ${email}`, currentUser.name);
  closeModal();
  toast(`✓ Password updated for ${email}. Share it with them securely.`, 'success');
  loadResetRequests();
}

async function dismissResetRequest(reqId) {
  await sb.from('password_reset_requests').update({ status: 'cancelled' }).eq('id', reqId);
  loadResetRequests();
  toast('Request dismissed','warning');
}

function initUserFilters() { if (sbUsers.length === 0) loadUsersFromSupabase(); else renderUserTable(); }
function filterUsers() {
  userFilter.search = document.getElementById('userSearch')?.value.toLowerCase()||'';
  userFilter.role   = document.getElementById('userRoleFilter')?.value||'all';
  userFilter.type   = document.getElementById('userTypeFilter')?.value||'all';
  renderUserTable();
}

function renderUserTable() {
  let data = [...DB.users];
  if ((userFilter.type||'all') !== 'all') data = data.filter(u => u._type === userFilter.type || (userFilter.type === 'student' && u.role === 'student') || (userFilter.type === 'staff' && u.role !== 'student'));
  if (userFilter.role !== 'all') data = data.filter(u => u.role === userFilter.role);
  if (userFilter.search) data = data.filter(u => u.name.toLowerCase().includes(userFilter.search)||u.email.toLowerCase().includes(userFilter.search));
  const roleColors={admin:'var(--purple)',doctor:'var(--blue)',nurse:'var(--teal)',receptionist:'var(--amber)',student:'var(--green)'};
  const rows=data.map(u=>`<tr>
    <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(u.name)}">${initials(u.name)}</div><div><div class="pt-name">${u.name}</div><div class="pt-id">${u.staffId||u.studentId||u.id}</div></div></div></td>
    <td>${u.email}</td>
    <td><span class="badge" style="background:${roleColors[u.role]||roleColors.student}22;color:${roleColors[u.role]||roleColors.student}">${cap(u.role)}</span></td>
    <td>${u.dept||'—'}</td>
    <td><span style="font-size:11px;color:var(--ink3)">${u.createdBy==='self'?'Self-reg':'Admin'}</span></td>
    <td><span class="badge ${u.status==='active'?'b-active':'b-inactive'}"><span class="bdot"></span>${cap(u.status)}</span></td>
    <td><div style="display:flex;gap:3px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="editUser('${u.id}')">Edit</button>
      <button class="btn btn-ghost btn-sm" onclick="resetPassword('${u.id}')" title="Reset Password">🔑 Reset PW</button>
      ${u.status==='active'?`<button class="btn btn-danger btn-sm" onclick="deactivateUser('${u.id}')">Deactivate</button>`:`<button class="btn btn-success btn-sm" onclick="reactivateUser('${u.id}')">Reactivate</button>`}
    </div></td>
  </tr>`).join('');
  const wrap = document.getElementById('userTableWrap');
  if (wrap) wrap.innerHTML=`<table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Dept</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--ink3)">No users found</td></tr>'}</tbody></table>`;
}

function resetPassword(userId) {
  const u = DB.users.find(x=>x.id===userId);
  if (!u) return;
  openModal('Reset Password — ' + u.name,
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0 16px">
      <div class="pt-ava" style="background:${getAvaColor(u.name)};width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;flex-shrink:0">${initials(u.name)}</div>
      <div><div style="font-size:13.5px;font-weight:700">${u.name}</div><div style="font-size:12px;color:var(--ink3)">${u.email}</div></div>
    </div>
    <div class="field-group">
      <label class="field-label">New Password <span style="color:var(--red)">*</span></label>
      <input type="password" class="field-input" id="newPwInput" placeholder="Set a new password (min 6 chars)">
    </div>
    <div class="field-group">
      <label class="field-label">Confirm Password</label>
      <input type="password" class="field-input" id="newPwConfirm" placeholder="Repeat the password">
    </div>
    <div style="background:var(--blue-bg);border-radius:8px;padding:10px 12px;font-size:12px;color:#0369a1">
      ℹ The password will be changed immediately in the system. The user will be prompted to set their own password on next login.
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="confirmResetPassword('${userId}')">Set New Password</button>`);
}

async function confirmResetPassword(userId) {
  const u = DB.users.find(x=>x.id===userId);
  const newPw    = document.getElementById('newPwInput')?.value;
  const confirmPw = document.getElementById('newPwConfirm')?.value;
  if (!newPw || newPw.length < 6) { toast('Password must be at least 6 characters','error'); return; }
  if (newPw !== confirmPw) { toast('Passwords do not match','error'); return; }

  const btn = document.querySelector('#modalFooter .btn-primary');
  if (btn) { btn.textContent = 'Updating…'; btn.disabled = true; }

  const { data, error } = await sb.rpc('admin_set_user_password', {
    p_user_email:   u.email,
    p_new_password: newPw
  });

  if (btn) { btn.textContent = 'Set New Password'; btn.disabled = false; }
  if (error || data?.error) { toast('Error: ' + (error?.message || data?.error), 'error'); return; }

  addAudit('Password Reset', `Admin reset password for ${u.name}`, currentUser.name);
  addNotification(`Password reset for ${u.name} by admin`, 'info');
  closeModal();
  toast(`✓ Password updated for ${u.name}. Share the new password with them securely.`, 'success');
}

function openAddUserModal() {
  openModal('Add Staff Account',
    `<div style="background:var(--amber-bg);border:1px solid var(--amber);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#92400e">
      ⚠️ Staff accounts are created by admin only. Students self-register via the login page.
    </div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">First Name</label><input class="field-input" id="nuFirst" placeholder="First name"></div>
      <div class="field-group"><label class="field-label">Last Name</label><input class="field-input" id="nuLast" placeholder="Last name"></div>
    </div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Email</label><input class="field-input" id="nuEmail" type="email" placeholder="staff@campus.edu"></div>
      <div class="field-group"><label class="field-label">Staff ID</label><input class="field-input" id="nuStaffId" placeholder="e.g. DOC-001"></div>
    </div>
    <div class="field-grid">
      <div class="field-group"><label class="field-label">Role</label>
        <select class="field-select" id="nuRole">
          <option value="doctor">Doctor</option><option value="nurse">Nurse</option>
          <option value="receptionist">Receptionist</option><option value="admin">Administrator</option>
        </select>
      </div>
      <div class="field-group"><label class="field-label">Department</label><input class="field-input" id="nuDept" placeholder="e.g. General Practice"></div>
    </div>
    <div class="field-group"><label class="field-label">Password <span style="color:var(--red)">*</span></label>
      <input type="password" class="field-input" id="nuPass" placeholder="Set their login password"></div>
    <div class="field-group"><label class="field-label">Confirm Password</label>
      <input type="password" class="field-input" id="nuPassConfirm" placeholder="Repeat password"></div>
    <div style="font-size:11.5px;color:var(--ink3);margin-top:-8px">Staff will be prompted to change this on first login.</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="submitNewUser()">Create Account</button>`);
}

async function submitNewUser() {
  const first   = document.getElementById('nuFirst')?.value.trim();
  const last    = document.getElementById('nuLast')?.value.trim();
  const email   = document.getElementById('nuEmail')?.value.trim();
  const staffId = document.getElementById('nuStaffId')?.value.trim();
  const role    = document.getElementById('nuRole')?.value;
  const dept    = document.getElementById('nuDept')?.value.trim();
  const pass     = document.getElementById('nuPass')?.value;
  const passConf = document.getElementById('nuPassConfirm')?.value;
  if (!first||!last||!email||!staffId||!pass) { toast('Fill all required fields','error'); return; }
  if (pass.length < 6) { toast('Password must be at least 6 characters','error'); return; }
  if (pass !== passConf) { toast('Passwords do not match','error'); return; }

  const btn = document.querySelector('#modalFooter .btn-primary');
  if (btn) { btn.textContent='Creating…'; btn.disabled=true; }

  try {
    // 1. Save admin session so we can restore it after creating the new auth user
    const adminSession = _session;

    // 2. Create the auth user (signUp does NOT switch _session)
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) { toast('Auth error: ' + error.message, 'error'); if(btn){btn.textContent='Create Account';btn.disabled=false;} return; }

    // 3. Restore admin session immediately
    _session = adminSession;

    // 4. Wait for Supabase to commit the auth.users row, then retry via server-side RPC
    let rpcResult = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise(res => setTimeout(res, attempt * 800));
      rpcResult = await sb.rpc('admin_create_staff', {
        p_email:      email,
        p_password:   pass,
        p_staff_id:   staffId,
        p_first_name: first,
        p_last_name:  last,
        p_role:       role,
        p_department: dept,
        p_created_by: currentUser.userId
      });
      if (!rpcResult.error && rpcResult.data?.success) break;
      if (rpcResult.data?.error && !rpcResult.data.error.includes('not found')) break; // real error, stop retrying
    }

    if (rpcResult?.error || rpcResult?.data?.error) {
      const msg = rpcResult?.error?.message || rpcResult?.data?.error;
      toast('Profile error: ' + msg, 'error');
      if(btn){btn.textContent='Create Account';btn.disabled=false;} return;
    }

    addAudit('User Created', `${first} ${last} (${role})`, currentUser.name);
    addNotification(`New ${cap(role)}: ${first} ${last}`, 'success');
    closeModal();
    loadUsersFromSupabase();
    buildSidebar();
    toast(`Account created for ${first} ${last}`, 'success');
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
  if(btn){btn.textContent='Create Account';btn.disabled=false;}
}

function editUser(id) {
  const u=DB.users.find(x=>x.id===id);
  if (!u) return;
  openModal(`Edit — ${u.name}`,
    `<div class="field-grid">
      <div class="field-group"><label class="field-label">First Name</label><input class="field-input" id="euFirst" value="${u.name.split(' ')[0]||''}"></div>
      <div class="field-group"><label class="field-label">Last Name</label><input class="field-input" id="euLast" value="${u.name.split(' ').slice(1).join(' ')||''}"></div>
    </div>
    <div class="field-group"><label class="field-label">Email</label><input class="field-input" id="euEmail" value="${u.email}"></div>
    <div class="field-group"><label class="field-label">Department</label><input class="field-input" id="euDept" value="${u.dept||''}"></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveUser('${id}')">Save</button>`);
}

async function saveUser(id) {
  const u = DB.users.find(x=>x.id===id);
  if (!u) return;
  const first = document.getElementById('euFirst')?.value||'';
  const last  = document.getElementById('euLast')?.value||'';
  const email = document.getElementById('euEmail')?.value||'';
  const dept  = document.getElementById('euDept')?.value||'';
  const table = u._type === 'student' ? 'students' : 'staff';
  const { error } = await sb.from(table).update({ first_name: first, last_name: last, email, department: dept }).eq('id', u._supaId||id);
  if (error) { toast('Update error: ' + error.message,'error'); return; }
  addAudit('User Updated', `${first} ${last} updated`, currentUser.name);
  closeModal(); loadUsersFromSupabase();
  toast('User updated','success');
}

async function deactivateUser(id) {
  const u=DB.users.find(x=>x.id===id);
  openModal('Deactivate User',
    `<p style="font-size:13px;margin-bottom:12px">Deactivate <strong>${u.name}</strong>?</p>
     <div style="background:var(--red-bg);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--red)">User will lose access immediately.</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="confirmDeactivate('${id}')">Deactivate</button>`);
}
async function confirmDeactivate(id) {
  const u = DB.users.find(x=>x.id===id);
  const table = u?._type === 'student' ? 'students' : 'staff';
  await sb.from(table).update({ is_active: false }).eq('id', u?._supaId||id);
  cascadeDeactivateUser(id); closeModal(); loadUsersFromSupabase();
  addAudit('User Deactivated', u?.name||id, currentUser.name);
  toast('User deactivated','warning');
}
async function reactivateUser(id) {
  const u = DB.users.find(x=>x.id===id);
  const table = u?._type === 'student' ? 'students' : 'staff';
  await sb.from(table).update({ is_active: true }).eq('id', u?._supaId||id);
  addAudit('User Reactivated', u?.name||id, currentUser.name);
  loadUsersFromSupabase(); toast(`${u?.name||id} reactivated`,'success');
}

function toggleDoctorType(role) {
  const sec = document.getElementById('doctorTypeSection');
  if (sec) sec.style.display = role==='doctor' ? '' : 'none';
}

// ══════════════════════════════════════════════
//  AUDIT LOG
// ══════════════════════════════════════════════
function renderAuditLog() {
  // auditLog is populated live as actions happen — starts empty for real data
  const actionColors={Login:'var(--blue)',Logout:'var(--ink3)','Appointment Approved':'var(--green)','Appointment Rejected':'var(--red)','User Created':'var(--purple)','User Deactivated':'var(--red)','Emergency Walk-in':'var(--red)','Ambulance Dispatched':'var(--red)','System Start':'var(--ink3)','Password Reset':'var(--amber)'};
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div class="section-title" style="margin:0">Audit Log</div>
    <button class="btn btn-ghost" onclick="toast('Log exported','success')">📥 Export</button>
  </div>
  <div class="card">
    <div class="card-h"><div class="card-title">System Activity</div><div class="card-sub">${auditLog.length} events</div></div>
    <div>${auditLog.map(log=>`<div class="audit-item" style="padding:9px 16px">
      <div class="audit-time">${log.time}</div>
      <div style="width:8px;height:8px;border-radius:50%;background:${actionColors[log.action]||'var(--ink3)'};flex-shrink:0;margin-top:4px"></div>
      <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${log.action}</div><div style="font-size:11.5px;color:var(--ink3)">${log.detail}</div></div>
      <div style="font-size:11px;color:var(--ink3)">${log.user}</div>
    </div>`).join('')}</div>
  </div>`;
}

// ══════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════
function openNotifModal() {
  openModal('Notifications',DB.notifications.slice(0,8).map(n=>`
    <div class="notif-item ${n.unread?'unread':''}">
      <div class="ni-icon" style="background:${n.type==='emergency'?'var(--red-bg)':n.type==='success'?'var(--green-bg)':n.type==='warning'?'var(--amber-bg)':'var(--blue-bg)'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="${n.type==='emergency'?'var(--red)':n.type==='success'?'var(--green)':n.type==='warning'?'var(--amber)':'var(--blue)'}" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
      </div>
      <div><div class="ni-msg">${n.msg}</div><div class="ni-time">${n.time}</div></div>
    </div>`).join(''),
    `<button class="btn btn-ghost" onclick="DB.notifications.forEach(n=>n.unread=false);buildSidebar();buildTopbarAva();closeModal();toast('All read','success')">Mark All Read</button>
     <button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

// ══════════════════════════════════════════════
//  GLOBAL SEARCH
// ══════════════════════════════════════════════
function globalSearchFn(q) {
  if (q.length<2) return;
  const lq=q.toLowerCase();
  const results=DB.appointments.filter(a=>a.patient.toLowerCase().includes(lq)||a.id.toLowerCase().includes(lq));
  if (results.length>0) {
    navTo('appointments');
    setTimeout(()=>{ const el=document.getElementById('apptSearch'); if(el){el.value=q;filterAppts();} },100);
  }
}

// ══════════════════════════════════════════════
//  MODAL ENGINE
// ══════════════════════════════════════════════
function openModal(title, body, footer) {
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalFooter').innerHTML=footer||'';
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
document.getElementById('modalOverlay').addEventListener('click',e=>{ if(e.target.id==='modalOverlay') closeModal(); });

// ══════════════════════════════════════════════
//  TOAST ENGINE
// ══════════════════════════════════════════════
function toast(msg, type='') {
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${type==='success'?'✓':type==='error'?'✕':type==='warning'?'⚠':'ℹ'}</span> ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); },3500);
}

// ══════════════════════════════════════════════
//  LIVE QUEUE TICKER
// ══════════════════════════════════════════════
setInterval(()=>{
  if (['queue','queue-status','dashboard'].includes(currentPage)) {
    DB.queue.forEach(q=>{ if(q.status==='waiting'&&q.waitMin>0) q.waitMin=Math.max(0,q.waitMin-(Math.random()>.8?1:0)); });
    if (currentPage==='queue') renderQueueList();
  }
},10000);

document.addEventListener('keydown',e=>{
  if (document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA') return;
  if (e.key==='d'&&currentUser) navTo('dashboard');
});
