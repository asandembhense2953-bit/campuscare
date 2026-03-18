// ╔══════════════════════════════════════════════════════════════╗
// ║  CampusCare — Booking System & Student Features              ║
// ║  Developer  : Siyamthanda Mthethwa                           ║
// ║  GitHub     : @siyamthanda                                   ║
// ║  Branch     : feature/booking-student                        ║
// ╚══════════════════════════════════════════════════════════════╝
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
  return `<div class="card">
    <div class="card-h"><div><div class="card-title">My Appointments</div><div class="card-sub">${myAppts.length} on record · Only pending appointments can be edited or cancelled</div></div>
    <button class="btn btn-primary" onclick="navTo('booking')">+ Book New</button></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${myAppts.map(a=>`<tr>
        <td><span class="appt-id">#${a.id}</span></td>
        <td>${a.date}</td><td>${a.time}</td>
        <td>${a.doctor}</td>
        <td><span class="badge ${a.type==='emergency'?'b-emergency':'b-normal'}"><span class="bdot"></span>${cap(a.type)}</span></td>
        <td><span class="badge ${statusBadge(a.status)}"><span class="bdot"></span>${cap(a.status)}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="viewAppt('${a.id}')">View</button>
          ${a.status==='pending'?`<button class="btn btn-primary btn-sm" onclick="studentEditAppt('${a.id}')">Edit</button>`:''}
          ${a.status==='pending'?`<button class="btn btn-danger btn-sm" onclick="studentCancelAppt('${a.id}')">Cancel</button>`:''}
          ${a.status!=='pending'&&a.status!=='completed'?`<span style="font-size:10.5px;color:var(--ink3);padding:0 4px">Locked</span>`:''}
        </td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--ink3)">No appointments</td></tr>'}</tbody>
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

