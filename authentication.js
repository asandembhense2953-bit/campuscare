// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Authentication System                          ║
// ║  Developer  : Ayanda Gwala                                   ║
// ║  GitHub     : @ayanda_gwala                                  ║
// ║  Branch     : feature/authentication                         ║
// ╚══════════════════════════════════════════════════════════════╝
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

function openPasswordChangeModal() {
  // Show modal requiring user to change their admin-set password
  document.getElementById('loginPage').style.display='none';
  document.getElementById('appShell').style.display='flex';
  buildSidebar(); buildTopbarAva(); navTo('dashboard');
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
  navTo('dashboard');
  toast(`Welcome, ${currentUser.name.split(' ')[0]}! 👋`,'success');
  // Load all real data from Supabase
  await loadAllData();
  // Refresh current page to show real data
  navTo(currentPage);
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

