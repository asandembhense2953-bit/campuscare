// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — User Management, Reports & UI Engine           ║
// ║  Developer  : Siphesihle Ntshele                             ║
// ║  GitHub     : @siphesihle                                    ║
// ║  Branch     : feature/user-management                        ║
// ╚══════════════════════════════════════════════════════════════╝
// ══════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════
function renderReports() {
  const byStatus={}, byDoctor={};
  DB.appointments.forEach(a=>{byStatus[a.status]=(byStatus[a.status]||0)+1; byDoctor[a.doctor]=(byDoctor[a.doctor]||0)+1;});
  const bars=[{d:'Mon',v:19},{d:'Tue',v:22},{d:'Wed',v:18},{d:'Thu',v:25},{d:'Fri',v:22},{d:'Sat',v:12},{d:'Sun',v:21}];
  const maxV=Math.max(...bars.map(b=>b.v));
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
  </div>
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
      ${Object.entries(byStatus).map(([k,v])=>`<div class="report-row"><span class="badge ${statusBadge(k)}"><span class="bdot"></span>${cap(k)}</span><div style="display:flex;align-items:center;gap:10px"><div style="width:90px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(v/DB.appointments.length*100)}%;background:var(--blue);border-radius:3px"></div></div><span class="r-val">${v}</span></div></div>`).join('')}
    </div>
    <div class="card"><div class="card-h"><div class="card-title">By Doctor</div></div>
      ${Object.entries(byDoctor).map(([k,v])=>`<div class="report-row"><span style="font-size:12px;font-weight:500">${k}</span><div style="display:flex;align-items:center;gap:10px"><div style="width:90px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(v/DB.appointments.length*100)}%;background:var(--teal);border-radius:3px"></div></div><span class="r-val">${v}</span></div></div>`).join('')}
    </div>
  </div>`;
}

function exportCSV() {
  const headers=['ID','Patient','Student ID','Date','Time','Type','Doctor','Status','Source','Notes'];
  const rows=DB.appointments.map(a=>[a.id,a.patient,a.studentId,a.date,a.time,a.type,a.doctor,a.status,a.source||'',`"${a.notes||''}"`]);
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
</script>
