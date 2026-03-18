// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Doctor Dashboard & Queue Management            ║
// ║  Developer  : Nqubeko Masinga                                ║
// ║  GitHub     : @nqubeko                                       ║
// ║  Branch     : feature/doctor-queue                           ║
// ╚══════════════════════════════════════════════════════════════╝
        </div>
        <div style="padding:10px">${renderEmergencyAlerts(true)}</div>
      </div>
    </div>`:''}
    <div class="two-col">
      <div class="card">
        <div class="card-h"><div><div class="card-title">Recent Appointments</div></div><button class="btn btn-ghost btn-sm" onclick="navTo('appointments')">View All</button></div>
        <div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Patient</th><th>Date</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>${DB.appointments.slice(0,4).map(a=>`<tr>
          <td><span class="appt-id">#${a.id}</span></td>
          <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div class="pt-name">${a.patient}</div></div></td>
          <td>${a.date}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
        </tr>`).join('')}</tbody></table></div>
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
        <tbody>${myAppts.slice(0,4).map(a=>`<tr>
          <td>${a.date} ${a.time}</td><td>${a.doctor}</td>
          <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
          <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
          <td>${a.status==='pending'?`<button class="btn btn-ghost btn-sm" onclick="studentEditAppt('${a.id}')">Edit</button>`:''}
              ${a.status==='pending'?`<button class="btn btn-danger btn-sm" onclick="cancelAppt('${a.id}')">Cancel</button>`:''}</td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ink3)">No appointments yet</td></tr>'}</tbody></table></div>
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
  const todayAppts = DB.appointments.filter(a=>a.date==='2026-03-01');
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
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span>Front Desk View</span><span style="margin-left:auto;font-size:11px;color:var(--ink3)">Sun, 1 Mar 2026 · ${nowTime()}</span></div>
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
          <tbody>${todayAppts.slice(0,5).map(a=>`<tr>
            <td><div class="pt-cell"><div class="pt-ava" style="background:${getAvaColor(a.patient)}">${initials(a.patient)}</div><div><div class="pt-name">${a.patient}</div><div class="pt-id">${a.studentId}</div></div></div></td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${a.time}</td>
            <td>${a.doctor}</td>
            <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
            <td style="display:flex;gap:3px">
              <button class="btn btn-ghost btn-sm" onclick="viewAppt('${a.id}')">View</button>
              ${a.status==='pending'?`<button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">✓</button>`:''}
            </td>
          </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ink3)">No appointments today</td></tr>'}</tbody></table></div>
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
    <div class="realtime-bar"><div class="live-badge"><div class="live-dot"></div>Live</div><span>Clinical view · ${doctorTypeLabel}</span><span style="margin-left:auto;font-size:11px;color:var(--ink3)">Sun, 1 Mar 2026 · ${nowTime()}</span></div>
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
        ${myPending.slice(0,3).map(a=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--border2)">
          <div class="pt-ava" style="background:${getAvaColor(a.patient)};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">${initials(a.patient)}</div>
          <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${a.patient}</div><div style="font-size:11px;color:var(--ink3)">${a.date} ${a.time} · ${cap(a.type)}</div></div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="approveAppt('${a.id}')">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectAppt('${a.id}')">Reject</button>
          </div>
        </div>`).join('')}</div>`:''}
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
      <select class="filter-select" id="apptStatusFilter" onchange="filterAppts()"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select>
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
