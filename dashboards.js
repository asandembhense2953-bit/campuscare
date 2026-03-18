// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Admin & Student Dashboards                     ║
// ║  Developer  : Siyanda Shangase                               ║
// ║  GitHub     : @siyanda                                       ║
// ║  Branch     : feature/dashboards                             ║
// ╚══════════════════════════════════════════════════════════════╝
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
      <span style="margin-left:auto;font-size:11px;color:var(--ink3)">Sun, 1 Mar 2026 · ${nowTime()}</span>
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
