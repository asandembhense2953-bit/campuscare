// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Appointments, Medical Records & Consultations  ║
// ║  Developer  : Slindokuhle Ngcobo                             ║
// ║  GitHub     : @slindo                                        ║
// ║  Branch     : feature/appointments-records                   ║
// ╚══════════════════════════════════════════════════════════════╝
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
        return `<tr>
          <td><span class="appt-id">#${a.id}</span></td>
          <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div><div class="pt-name">${a.patient}</div><div class="pt-id">${a.studentId}</div></div></div></td>
          <td>${a.date}</td><td>${a.time}</td>
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
