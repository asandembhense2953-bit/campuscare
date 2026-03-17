// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Project Setup & Supabase Integration           ║
// ║  Developer  : Asande Mbhense                                 ║
// ║  GitHub     : @asande                                        ║
// ║  Branch     : feature/supabase-setup                         ║
// ╚══════════════════════════════════════════════════════════════╝
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
    if (r.ok || r.status === 200 || r.status === 404) {
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

  } catch(e) {
    console.error('loadAllData error:', e);
  }
}

