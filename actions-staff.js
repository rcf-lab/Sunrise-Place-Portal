// =====================================================
//  actions-staff.js  -  what STAFF and ADMIN buttons do
//  Also has the little "finder" tools the staff screens use.
//  Staff work on ALL homeowners (db.homeowners),
//  not on state.user (state.user is the staff member).
// =====================================================


// ---------- 1. FINDER TOOLS ----------

// Live search: redraws only the list of homeowners, so the cursor never leaves the box
function staffSearch(value) {
  state.form.hsearch = value;
  var list = document.getElementById('peopleList');
  if (list) { list.innerHTML = peopleListHtml(); }
}

// Today's date and time, like "Nov 8, 4:30 PM"
function nowText() {
  return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Writes one line into the audit trail (who did what, and when)
function addAudit(action) {
  db.audit.unshift({ when: nowText(), who: state.user.name, role: state.role, action: action });
}

function findOwnerById(id) {
  for (var i = 0; i < db.homeowners.length; i++) {
    if (db.homeowners[i].id === id) { return db.homeowners[i]; }
  }
  return null;
}

function ownerName(owner) {
  return owner.first + ' ' + owner.last;
}

function unitText(owner) {
  return 'Block ' + owner.block + ' · Lot ' + owner.lot + ' · Phase ' + owner.phase;
}

// How much one homeowner still owes (verified payments only)
function owedBy(owner) {
  var total = 0;
  for (var i = 0; i < owner.months.length; i++) {
    total = total + owner.months[i].due - owner.months[i].paid;
  }
  return total;
}

// Pending money for one month of one homeowner
function pendingFor(owner, monthName) {
  var total = 0;
  for (var i = 0; i < owner.pays.length; i++) {
    if (isPending(owner.pays[i]) && owner.pays[i].month === monthName) { total = total + owner.pays[i].amt; }
  }
  return total;
}

// Every payment waiting for verification, from every homeowner
function allPendingPayments() {
  var list = [];
  for (var i = 0; i < db.homeowners.length; i++) {
    var owner = db.homeowners[i];
    for (var j = 0; j < owner.pays.length; j++) {
      if (isPending(owner.pays[j])) { list.push({ owner: owner, pay: owner.pays[j] }); }
    }
  }
  return list;
}

// If the same reference number appears on ANOTHER payment, return that owner. Otherwise null.
function duplicateOwner(pay) {
  if (pay.ref === '—') { return null; }
  for (var i = 0; i < db.homeowners.length; i++) {
    var owner = db.homeowners[i];
    for (var j = 0; j < owner.pays.length; j++) {
      if (owner.pays[j] !== pay && owner.pays[j].ref === pay.ref) { return owner; }
    }
  }
  return null;
}

// Every booked visit from every homeowner, in date and time order
function allAppointments() {
  var list = [];
  for (var i = 0; i < db.homeowners.length; i++) {
    var owner = db.homeowners[i];
    for (var j = 0; j < owner.appts.length; j++) {
      list.push({ owner: owner, appt: owner.appts[j] });
    }
  }
  list.sort(function (a, b) {
    var dayA = dayPosition(a.appt.date);
    var dayB = dayPosition(b.appt.date);
    if (dayA !== dayB) { return dayA - dayB; }
    return TIME_SLOTS.indexOf(a.appt.time) - TIME_SLOTS.indexOf(b.appt.time);
  });
  return list;
}

// Position of a day in db.days (used for sorting)
function dayPosition(label) {
  for (var i = 0; i < db.days.length; i++) {
    if (db.days[i].label === label) { return i; }
  }
  return 99;
}

function openCorrectionCount() {
  var count = 0;
  for (var i = 0; i < db.corrections.length; i++) {
    if (db.corrections[i].status === 'Open') { count = count + 1; }
  }
  return count;
}

// Money-related requests need an ADMIN to approve
function isMoneyCorrection(correction) {
  return correction.type === 'A payment is missing' || correction.type === 'Wrong amount charged';
}


// Has this official receipt number been recorded before?
function receiptUsed(receipt) {
  for (var i = 0; i < db.homeowners.length; i++) {
    var pays = db.homeowners[i].pays;
    for (var j = 0; j < pays.length; j++) {
      if (pays[j].receipt && pays[j].receipt.toLowerCase() === receipt.toLowerCase()) { return true; }
    }
  }
  return false;
}

// The reasons staff can choose when they reject a payment
var REJECT_REASONS = [
  'Reference number not found in the HOA account',
  'Amount does not match the HOA record',
  'Reference number was already used',
  'Wrong month or wrong details',
  'Other (explain in the note)'
];


// ---------- 2. LITTLE FORMS (reject, cash, reply) ----------

// Opens a little form under a card. Pressing again closes it.
function togglePanel(key) {
  state.errors = {};
  state.form.rreason = '';
  state.form.rnote = '';
  state.form.cresp = '';
  state.form.camount = '';
  state.form.creceipt = '';
  state.panel = (state.panel === key) ? null : key;
  render();
}

// How much cash the office can still take from this homeowner
// (unpaid dues, minus money already sent and waiting for verification)
function cashDue(owner) {
  var total = 0;
  for (var i = 0; i < owner.months.length; i++) {
    var left = owner.months[i].due - owner.months[i].paid - pendingFor(owner, owner.months[i].m);
    if (left > 0) { total = total + left; }
  }
  return total;
}

function openCashPanel(ownerId) {
  var key = 'cash' + ownerId;
  togglePanel(key);
  if (state.panel === key) {
    state.form.camount = cashDue(findOwnerById(ownerId));
    state.form.creceipt = '';
    render();
  }
}

// "Save cash payment" button: needs the amount AND the official receipt number.
// The money pays the oldest unpaid month first, then the next, and so on.
function recordCash(ownerId) {
  var owner = findOwnerById(ownerId);
  var amount = Number(state.form.camount);
  var receipt = (state.form.creceipt || '').trim();
  var available = cashDue(owner);

  state.errors = {};
  if (!(amount > 0)) {
    state.errors.camount = 'Enter the amount received.';
  } else if (amount > available) {
    state.errors.camount = 'That is more than the ' + peso(available) + ' this homeowner still owes.';
  }
  if (receipt.length < 3) {
    state.errors.creceipt = 'Enter the official receipt number.';
  } else if (receiptUsed(receipt)) {
    state.errors.creceipt = 'This receipt number was already recorded.';
  }
  if (hasErrors()) { render(); return; }

  var moneyLeft = amount;
  var covered = [];
  for (var i = 0; i < owner.months.length && moneyLeft > 0; i++) {
    var month = owner.months[i];
    var room = month.due - month.paid - pendingFor(owner, month.m);
    if (room <= 0) { continue; }
    var part = Math.min(room, moneyLeft);
    owner.pays.push({
      id: nextId(owner.pays),
      date: todayText(),
      month: month.m,
      amt: part,
      method: 'Cash (office)',
      ref: '—',
      receipt: receipt,
      status: 'Verified'
    });
    month.paid = month.paid + part;
    moneyLeft = moneyLeft - part;
    covered.push(month.m + ' ' + peso(part));
  }

  owner.notifs.unshift({
    title: 'Cash payment recorded',
    text: 'The office recorded your ' + peso(amount) + ' cash payment (receipt ' + receipt + '): ' + covered.join(', ') + '.',
    when: 'Just now',
    unread: true,
    go: 'history'
  });
  addAudit('Recorded ' + peso(amount) + ' cash from ' + ownerName(owner) + ' (receipt ' + receipt + '): ' + covered.join(', '));
  state.panel = null;
  showToast('Cash payment recorded');
}

// ---------- EDIT HOMEOWNER DETAILS ----------

// What the admin must say they checked before changing name, unit or email
var EDIT_DOCUMENTS = [
  'Valid government ID',
  'Marriage certificate',
  'Deed of sale / transfer papers',
  'Office record typo (original form checked)',
  'Other document'
];

// "Edit details" button: opens the form with the current values filled in
function openEditPanel(ownerId) {
  var key = 'edit' + ownerId;
  togglePanel(key);
  if (state.panel === key) {
    var o = findOwnerById(ownerId);
    state.form.ephone = o.phone || '';
    state.form.efirst = o.first;
    state.form.elast = o.last;
    state.form.eblock = o.block;
    state.form.elot = o.lot;
    state.form.ephase = o.phase;
    state.form.eemail = o.email || '';
    state.form.edoc = '';
    state.form.enote = '';
    render();
  }
}

// Which other homeowner is already on this block / lot / phase? (or null)
function unitTaken(ownerId, block, lot, phase) {
  for (var i = 0; i < db.homeowners.length; i++) {
    var h = db.homeowners[i];
    if (h.id !== ownerId && Number(h.block) === Number(block) && Number(h.lot) === Number(lot) && String(h.phase) === String(phase)) {
      return h;
    }
  }
  return null;
}

// Keeps a number a number (block, lot and phase are stored as numbers)
function sameKind(oldValue, text) {
  return typeof oldValue === 'number' ? Number(text) : String(text).trim();
}

// "Save changes" button
function saveDetails(ownerId) {
  var owner = findOwnerById(ownerId);
  var f = state.form;
  var isAdmin = state.role === 'admin';
  var changes = [];        // lines for the audit trail
  var changedNames = [];   // field names for the homeowner's notice
  var adminChange = false;
  state.errors = {};

  // phone: staff and admin
  var phone = String(f.ephone || '').trim();
  if (phone !== '' && !/^[0-9+\-\s()]{7,}$/.test(phone)) {
    state.errors.ephone = 'Enter a valid phone number, or leave it empty.';
  }
  if (phone !== (owner.phone || '')) {
    changes.push('Phone "' + (owner.phone || 'none') + '" → "' + (phone || 'none') + '"');
    changedNames.push('phone number');
  }

  // everything below is admin only
  var newFirst = owner.first, newLast = owner.last, newBlock = owner.block, newLot = owner.lot, newPhase = owner.phase, newEmail = owner.email;
  if (isAdmin) {
    newFirst = String(f.efirst || '').trim();
    newLast = String(f.elast || '').trim();
    if (newFirst === '') { state.errors.efirst = 'First name is required.'; }
    if (newLast === '') { state.errors.elast = 'Last name is required.'; }
    if (!(Number(f.eblock) > 0)) { state.errors.eblock = 'Enter the block number.'; }
    if (!(Number(f.elot) > 0)) { state.errors.elot = 'Enter the lot number.'; }
    if (String(f.ephase).trim() === '') { state.errors.ephase = 'Enter the phase.'; }

    if (!state.errors.eblock && !state.errors.elot && !state.errors.ephase) {
      newBlock = sameKind(owner.block, f.eblock);
      newLot = sameKind(owner.lot, f.elot);
      newPhase = sameKind(owner.phase, f.ephase);
      var other = unitTaken(owner.id, newBlock, newLot, newPhase);
      if (other !== null) {
        state.errors.elot = 'Block ' + newBlock + ' · Lot ' + newLot + ' · Phase ' + newPhase + ' is already assigned to ' + ownerName(other) + '.';
      }
    }

    if (owner.claimed !== false) {
      newEmail = String(f.eemail || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
        state.errors.eemail = 'Enter a valid email.';
      } else if (newEmail !== owner.email && emailExists(newEmail)) {
        state.errors.eemail = 'Another account already uses this email.';
      }
    }

    if (newFirst !== owner.first || newLast !== owner.last) {
      changes.push('Name "' + ownerName(owner) + '" → "' + newFirst + ' ' + newLast + '"');
      changedNames.push('name');
      adminChange = true;
    }
    if (String(newBlock) !== String(owner.block) || String(newLot) !== String(owner.lot) || String(newPhase) !== String(owner.phase)) {
      changes.push('Unit "' + unitText(owner) + '" → "Block ' + newBlock + ' · Lot ' + newLot + ' · Phase ' + newPhase + '"');
      changedNames.push('block, lot or phase');
      adminChange = true;
    }
    if (newEmail !== owner.email) {
      changes.push('Email "' + owner.email + '" → "' + newEmail + '"');
      changedNames.push('email');
      adminChange = true;
    }
    if (adminChange) { requireField('edoc', 'Choose the document you checked.'); }
  }

  var note = String(f.enote || '').trim();
  if (changes.length === 0 && !hasErrors()) {
    state.errors.enote = 'Nothing was changed.';
  } else if (changes.length > 0 && note.length < 5) {
    state.errors.enote = 'Write a short reason (at least 5 characters).';
  }
  if (hasErrors()) { render(); return; }

  owner.phone = phone;
  owner.first = newFirst;
  owner.last = newLast;
  owner.block = newBlock;
  owner.lot = newLot;
  owner.phase = newPhase;
  owner.email = newEmail;

  owner.notifs.unshift({
    title: 'Your details were updated',
    text: 'The HOA office updated your ' + changedNames.join(', ') + '. If this is not right, please send a correction request.',
    when: 'Just now',
    unread: true,
    go: 'profile'
  });
  addAudit('Edited details of ' + ownerName(owner) + ': ' + changes.join('; ') +
    (adminChange ? ' (document: ' + f.edoc + ')' : '') + '. Reason: ' + note);
  state.panel = null;
  showToast('Details updated');
}

// ---------- 3. PAYMENTS ----------

// "Verify" button: the money really arrived
function verifyPayment(ownerId, payId) {
  var owner = findOwnerById(ownerId);
  var pay = null;
  for (var i = 0; i < owner.pays.length; i++) {
    if (owner.pays[i].id === payId) { pay = owner.pays[i]; }
  }
  if (pay === null || !isPending(pay)) { return; }

  pay.status = 'Verified';
  for (var m = 0; m < owner.months.length; m++) {
    if (owner.months[m].m === pay.month) { owner.months[m].paid = owner.months[m].paid + pay.amt; }
  }
  owner.notifs.unshift({
    title: 'Payment verified',
    text: 'Your ' + peso(pay.amt) + ' payment for ' + pay.month + ' was verified.',
    when: 'Just now',
    unread: true,
    go: 'history'
  });
  addAudit('Verified ' + peso(pay.amt) + ' from ' + ownerName(owner) + ' (' + pay.month + ', ref ' + pay.ref + ')');
  showToast('Payment verified');
}

// "Confirm reject" button: needs a reason, so the homeowner knows what went wrong
function rejectPayment(ownerId, payId) {
  var owner = findOwnerById(ownerId);
  var pay = null;
  for (var i = 0; i < owner.pays.length; i++) {
    if (owner.pays[i].id === payId) { pay = owner.pays[i]; }
  }
  if (pay === null || !isPending(pay)) { return; }

  state.errors = {};
  requireField('rreason', 'Choose a reason.');
  var note = (state.form.rnote || '').trim();
  if ((state.form.rreason || '').indexOf('Other') === 0 && note === '') {
    state.errors.rnote = 'Please explain in the note.';
  }
  if (hasErrors()) { render(); return; }

  var reason = state.form.rreason;
  if (note !== '') { reason = reason + ' — ' + note; }

  pay.status = 'Rejected';
  pay.reason = reason;
  owner.notifs.unshift({
    title: 'Payment rejected',
    text: 'Your ' + peso(pay.amt) + ' payment for ' + pay.month + ' was rejected. Reason: ' + reason,
    when: 'Just now',
    unread: true,
    go: 'history'
  });
  addAudit('Rejected ' + peso(pay.amt) + ' from ' + ownerName(owner) + ' (ref ' + pay.ref + '). Reason: ' + reason);
  state.panel = null;
  showToast('Payment rejected');
}

// ---------- 4. VISITS ----------

// "Completed" or "No-show": moves the visit to the homeowner's past visits
function finishVisit(ownerId, apptId, outcome) {
  var owner = findOwnerById(ownerId);
  for (var i = 0; i < owner.appts.length; i++) {
    if (owner.appts[i].id === apptId) {
      var appt = owner.appts.splice(i, 1)[0];
      owner.pastAppts.unshift({ purpose: appt.purpose, date: appt.date, time: appt.time, status: outcome });
      addAudit('Marked ' + ownerName(owner) + '’s ' + appt.purpose + ' visit as ' + outcome);
      showToast('Visit marked as ' + outcome.toLowerCase());
      return;
    }
  }
}


// ---------- 5. CORRECTION REQUESTS ----------

// "Send reply" button: marks the request as resolved AND tells the homeowner how
function resolveCorrection(id) {
  for (var i = 0; i < db.corrections.length; i++) {
    var c = db.corrections[i];
    if (c.id === id && c.status === 'Open') {
      if (isMoneyCorrection(c) && state.role !== 'admin') {
        showToast('Money corrections need an admin');
        return;
      }
      state.errors = {};
      var reply = (state.form.cresp || '').trim();
      if (reply.length < 5) {
        state.errors.cresp = 'Please write a short reply for the homeowner.';
        render();
        return;
      }

      c.status = 'Resolved';
      c.response = reply;
      c.resolvedBy = state.user.name;
      var owner = findOwnerById(c.homeownerId);
      if (owner) {
        owner.notifs.unshift({
          title: 'Correction request resolved',
          text: 'Your request (' + c.type + ') was resolved: ' + reply,
          when: 'Just now',
          unread: true,
          go: 'myrequests'
        });
        addAudit('Resolved correction request from ' + ownerName(owner) + ' (' + c.type + '). Reply: ' + reply);
      }
      state.panel = null;
      showToast('Reply sent to the homeowner');
      return;
    }
  }
}


// ---------- 6. ADMIN: ANNOUNCEMENTS ----------

// Fills the form with an existing announcement so the admin can fix it
function startEditNews(id) {
  for (var i = 0; i < db.news.length; i++) {
    if (db.news[i].id === id) {
      state.form.editId = id;
      state.form.ntitle = db.news[i].title;
      state.form.nbody = db.news[i].body;
    }
  }
  state.errors = {};
  render();
  var body = document.querySelector('.body');
  if (body) { body.scrollTop = 0; }
}

function cancelEditNews() {
  state.form.editId = null;
  state.form.ntitle = '';
  state.form.nbody = '';
  state.errors = {};
  render();
}

// "Post announcement" or "Save changes" button
function postAnnouncement() {
  state.errors = {};
  requireField('ntitle', 'Please enter a title.');
  requireField('nbody', 'Please write the announcement.');
  if (hasErrors()) { render(); return; }

  var shortDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  var title = state.form.ntitle.trim();
  var body = state.form.nbody.trim();

  if (state.form.editId) {
    // fixing an announcement that was already posted
    for (var i = 0; i < db.news.length; i++) {
      if (db.news[i].id === state.form.editId) {
        db.news[i].title = title;
        db.news[i].body = body;
        db.news[i].edited = shortDate;
      }
    }
    addAudit('Edited announcement: ' + title);
    state.form.editId = null;
    state.form.ntitle = '';
    state.form.nbody = '';
    showToast('Changes saved');
    return;
  }

  db.news.unshift({ id: nextId(db.news), title: title, date: shortDate, archived: false, body: body });

  // tell every homeowner
  for (var h = 0; h < db.homeowners.length; h++) {
    db.homeowners[h].notifs.unshift({
      title: 'New announcement',
      text: title,
      when: 'Just now',
      unread: true,
      go: 'announce'
    });
  }
  addAudit('Posted announcement: ' + title);
  state.form.ntitle = '';
  state.form.nbody = '';
  showToast('Announcement posted');
}

// Moves an announcement to the archive (or back)
function toggleArchiveNews(id) {
  for (var i = 0; i < db.news.length; i++) {
    if (db.news[i].id === id) {
      db.news[i].archived = !db.news[i].archived;
      addAudit((db.news[i].archived ? 'Archived' : 'Restored') + ' announcement: ' + db.news[i].title);
    }
  }
  render();
}


// ---------- 7. ADMIN: STAFF ACCOUNTS ----------

function createStaffAccount() {
  state.errors = {};
  var f = state.form;
  var email = (f.semail || '').trim().toLowerCase();

  requireField('sname', 'Enter the full name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) { state.errors.semail = 'Enter a valid email.'; }
  else if (emailExists(email)) { state.errors.semail = 'This email already has an account.'; }
  requireField('srole', 'Choose a role.');
  if ((f.spass || '').length < 8) { state.errors.spass = 'Use at least 8 characters.'; }
  if ((f.sadmin || '') !== state.user.pass) { state.errors.sadmin = 'That is not your password.'; }

  if (hasErrors()) { render(); return; }

  db.staff.push({
    id: nextId(db.staff),
    name: f.sname.trim(),
    role: f.srole,
    email: email,
    pass: f.spass,
    active: true
  });
  addAudit('Created ' + f.srole + ' account for ' + f.sname.trim());
  f.sname = ''; f.semail = ''; f.srole = ''; f.spass = ''; f.sadmin = '';
  showToast('Account created');
}

// Deactivate or reactivate an account
function toggleStaffActive(id) {
  for (var i = 0; i < db.staff.length; i++) {
    var s = db.staff[i];
    if (s.id === id) {
      if (s === state.user) { showToast('You cannot deactivate yourself'); return; }
      s.active = !s.active;
      addAudit((s.active ? 'Reactivated' : 'Deactivated') + ' account of ' + s.name);
      showToast(s.active ? 'Account reactivated' : 'Account deactivated');
      return;
    }
  }
}