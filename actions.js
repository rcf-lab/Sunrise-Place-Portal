// =====================================================
//  actions.js  -  what happens when someone presses a button
//  Every button in the screens calls one of these functions.
// =====================================================


// ---------- 1. BASIC TOOLS ----------

// Called while typing: remembers what was typed in a box
function setField(id, value) {
  state.form[id] = value;
}

// If a box is empty, save an error message for it
function requireField(id, message) {
  var value = state.form[id];
  if (value === undefined || value === null || String(value).trim() === '') {
    state.errors[id] = message;
  }
}

function hasErrors() {
  return Object.keys(state.errors).length > 0;
}

// Shows a small message at the bottom for about 2.5 seconds
var toastTimer = null;
function showToast(text) {
  state.toastText = text;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    state.toastText = '';
    render();
  }, 2600);
}

// Copies text to the clipboard (used by the "Copy" buttons)
function copyText(text) {
  try {
    navigator.clipboard.writeText(text).then(
      function () { showToast('Copied'); },
      function () { showToast('Select the text and copy it'); }
    );
  } catch (error) {
    showToast('Select the text and copy it');
  }
}

// Opens or closes a card (announcement, FAQ, cancel question)
function toggleOpen(id) {
  state.openItem = (state.openItem === id) ? null : id;
  render();
}


// ---------- 2. MOVING BETWEEN SCREENS ----------

// The first screen of whoever is logged in
function homeScreenName() {
  if (state.user === null) { return 'welcome'; }
  if (state.role === 'staff' || state.role === 'admin') { return 'staffHome'; }
  return 'home';
}

// Go to a screen, and remember where we came from (for Back)
function goTo(name) {
  if (state.screen !== name) { state.history.push(state.screen); }
  state.screen = name;
  state.errors = {};
  render();
}

// Back button
function goBack() {
  var previous = state.history.pop();
  state.screen = previous || homeScreenName();
  state.errors = {};
  render();
}

// Go to a screen and forget the history
function goRoot(name) {
  state.history = [];
  state.screen = name;
  state.errors = {};
  render();
}

// Tab bar buttons
function switchTab(name) {
  state.history = [];
  state.screen = name;
  state.openItem = null;
  state.errors = {};
  render();
}


// ---------- 3. ACCOUNTS: LOOKUPS ----------

function findHomeowner(email, password) {
  for (var i = 0; i < db.homeowners.length; i++) {
    var h = db.homeowners[i];
    if (h.claimed === false) { continue; }        // no online account yet
    if (h.email === email && h.pass === password) { return h; }
  }
  return null;
}

function findStaff(email, password) {
  for (var i = 0; i < db.staff.length; i++) {
    var s = db.staff[i];
    if (s.email === email && s.pass === password) { return s; }
  }
  return null;
}

function emailExists(email) {
  var i;
  for (i = 0; i < db.homeowners.length; i++) {
    if (db.homeowners[i].email === email) { return true; }
  }
  for (i = 0; i < db.staff.length; i++) {
    if (db.staff[i].email === email) { return true; }
  }
  return false;
}

function unitExists(block, lot, phase) {
  for (var i = 0; i < db.homeowners.length; i++) {
    var h = db.homeowners[i];
    if (Number(h.block) === Number(block) && Number(h.lot) === Number(lot) && String(h.phase) === String(phase)) {
      return true;
    }
  }
  return false;
}


// ---------- 4. LOGIN, REGISTER, LOGOUT ----------

// "Log in" button: checks the email and password, then opens the right screen
function doLogin() {
  var email = (state.form.lemail || '').trim().toLowerCase();
  var password = state.form.lpass || '';
  state.errors = {};

  if (state.loginFails >= 5) { render(); return; }

  var homeowner = findHomeowner(email, password);
  var staffMember = findStaff(email, password);

  if (staffMember !== null && staffMember.active === false) {
    state.errors.login = 'This account has been deactivated. Please contact an administrator.';
    render();
  } else if (homeowner !== null) {
    state.user = homeowner;
    state.role = 'homeowner';
    state.loginFails = 0;
    state.form = {};
    goRoot('home');
  } else if (staffMember !== null) {
    state.user = staffMember;
    state.role = staffMember.role;     // 'staff' or 'admin'
    state.loginFails = 0;
    state.form = {};
    goRoot('staffHome');
  } else {
    state.loginFails = state.loginFails + 1;
    state.errors.login = 'Email or password is incorrect.';
    render();
  }
}

// "Send reset link" button
function doForgot() {
  state.errors = {};
  var email = state.form.femail || '';
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    state.errors.femail = 'Enter a valid email.';
    render();
    return;
  }
  goTo('forgotdone');
}

// Finds the HOA record that matches the typed name AND unit (or null)
function findRecordForRegistration() {
  var f = state.form;
  for (var i = 0; i < db.homeowners.length; i++) {
    var h = db.homeowners[i];
    var sameName = h.first.toLowerCase() === f.rfirst.trim().toLowerCase() &&
                   h.last.toLowerCase() === f.rlast.trim().toLowerCase();
    var sameUnit = Number(h.block) === Number(f.rblock) &&
                   Number(h.lot) === Number(f.rlot) &&
                   String(h.phase) === String(f.rphase);
    if (sameName && sameUnit) { return h; }
  }
  return null;
}

// "Create account" button: matches the typed details to a record the office already has
function doRegister() {
  state.errors = {};
  var f = state.form;

  requireField('rfirst', 'First name is required.');
  requireField('rlast', 'Last name is required.');
  var email = (f.remail || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) { state.errors.remail = 'Enter a valid email.'; }
  if ((f.rpass || '').length < 8) { state.errors.rpass = 'Use at least 8 characters.'; }
  if (f.rpass2 !== f.rpass) { state.errors.rpass2 = 'Passwords do not match.'; }
  requireField('rblock', 'Required.');
  requireField('rlot', 'Required.');
  requireField('rphase', 'Choose a phase.');
  requireField('rcode', 'Activation code is required.');
  if (!f.rterms) { state.errors.rterms = 'Please accept to continue.'; }

  // Only check the HOA records if the form itself has no mistakes
  var record = null;
  if (!hasErrors()) {
    record = findRecordForRegistration();
    var codeOk = record !== null && record.claimed === false && record.code !== '' &&
                 record.code.toUpperCase() === f.rcode.trim().toUpperCase();

    if (record !== null && record.claimed !== false) {
      state.errors.rblock = 'This homeowner already has an account. Please visit the HOA office.';
    } else if (!codeOk) {
      state.errors.rcode = 'We couldn’t match these details to HOA records. Check them or visit the HOA office.';
    } else if (emailExists(email)) {
      state.errors.remail = 'An account with this email already exists.';
    }
  }

  // Any mistake? Show the form again with the messages.
  if (hasErrors()) {
    render();
    var firstError = document.querySelector('.bad, .err');
    if (firstError) { firstError.scrollIntoView({ block: 'center' }); }
    return;
  }

  // All good: link the account to the existing HOA record (balance and history stay)
  record.email = email;
  record.pass = f.rpass;
  record.phone = f.rphone || '';
  record.middle = (f.rmid || '').trim();
  record.claimed = true;
  record.code = '';                              // the code works only once
  record.notifs.unshift({
    title: 'Welcome to the portal',
    text: 'Your account is linked to your HOA record. Your balance and payment history are shown here.',
    when: 'Just now',
    unread: true,
    go: 'history'
  });
  state.form = {};
  goTo('regdone');
}

function logout() {
  state.user = null;
  state.role = null;
  state.form = {};
  state.errors = {};
  state.openItem = null;
  state.showArchived = false;
  goRoot('welcome');
}

function logoutAll() {
  state.sessions = [state.sessions[0]];
  showToast('Logged out of other devices');
}

// "Reset demo data": erase what was saved, then reload the page
function resetDemoData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (error) { }
  location.reload();
}


// ---------- 5. PAYMENTS ----------

// "Pay" button next to a month
function startPayment(monthName) {
  state.form = { pmonth: monthName, pamount: remainingForMonth(findMonth(monthName)) };
  goTo('payflow');
}

// "Review" button: check the payment form
function reviewPayment() {
  state.errors = {};
  var f = state.form;
  var month = findMonth(f.pmonth);
  var amount = Number(f.pamount);
  var left = remainingForMonth(month);

  if (!(amount > 0)) {
    state.errors.pamount = 'Enter the amount you paid.';
  } else if (amount > left) {
    state.errors.pamount = 'That is more than the remaining ' + peso(left) + '.';
  }

  requireField('pmethod', 'Choose a method.');

  var ref = (f.pref || '').trim();
  if (!/^\d{6,}$/.test(ref)) {
    state.errors.pref = 'Enter the reference number (digits only, at least 6).';
  } else if (referenceUsed(ref)) {
    state.errors.pref = 'This reference number was already used. Check for typos.';
  }

  requireField('pdate', 'Pick the date you paid.');

  if (hasErrors()) { render(); return; }
  goTo('review');
}

// "Submit for verification" button
function submitPayment() {
  var me = state.user;
  var f = state.form;

  me.pays.push({
    id: nextId(me.pays),
    date: formatDate(f.pdate),
    month: f.pmonth,
    amt: Number(f.pamount),
    method: f.pmethod,
    ref: f.pref.trim(),
    status: 'Pending verification'
  });
  me.notifs.unshift({
    title: 'Payment submitted',
    text: peso(f.pamount) + ' for ' + f.pmonth + ' is waiting for staff to verify it. Your balance changes after verification.',
    go: 'history',
    when: 'Just now',
    unread: true
  });
  goTo('paydone');
}


function downloadStatement() {
  showToast('Prototype: the PDF download would start here');
}


// ---------- 6. OFFICE VISITS ----------

// Starts a booking. purpose can be '' (nothing chosen yet)
function startBooking(purpose) {
  state.form = { bpurpose: purpose, bday: '', btime: '' };
  goTo('book');
}

// "Review" button on the booking screen
function reviewBooking() {
  state.errors = {};

  requireField('bpurpose', 'Choose a purpose.');

  // If "Other" was chosen, make sure it was explained
  if (state.form.bpurpose === 'Other') {
    requireField('bother', 'Please tell us the purpose of the visit.');
  }

  if (!state.form.bday) {
    state.errors.bday = 'Pick a day.';
  } else if (!state.form.btime) {
    state.errors.btime = 'Pick a time.';
  }

  if (hasErrors()) { render(); return; }

  goTo('bookreview');
}

// "Confirm booking" button: takes the time slot for this homeowner
function confirmBooking() {
  var me = state.user;
  var f = state.form;
  var day = findDay(f.bday);
  var slotIndex = TIME_SLOTS.indexOf(f.btime);

  // make sure nobody took the slot in the meantime
  if (day === null || slotIndex < 0 || day.slotsLeft[slotIndex] !== 1) {
    state.form.btime = '';
    goBack();
    showToast('Sorry, that time was just taken. Please pick another.');
    return;
  }

  day.slotsLeft[slotIndex] = 0;       // the slot is now taken
  var finalPurpose = f.bpurpose;

  // Keep the homeowner's explanation
  if (f.bpurpose === 'Other') {
    finalPurpose = 'Other - ' + f.bother;
  }

  me.appts.push({
    id: nextId(me.appts),
    purpose: finalPurpose,
    date: f.bday,
    time: f.btime,
    status: 'Confirmed'
  });
  goTo('bookdone');
}

// Gives an appointment's time slot back, so someone else can book it
function freeSlot(appt) {
  var day = findDay(appt.date);
  var slotIndex = TIME_SLOTS.indexOf(appt.time);
  if (day !== null && slotIndex >= 0) { day.slotsLeft[slotIndex] = 1; }
}

// Removes an appointment from the homeowner's list and returns it
function removeAppointment(id) {
  var me = state.user;
  for (var i = 0; i < me.appts.length; i++) {
    if (me.appts[i].id === id) {
      freeSlot(me.appts[i]);
      return me.appts.splice(i, 1)[0];
    }
  }
  return null;
}

function cancelAppointment(id) {
  removeAppointment(id);
  state.openItem = null;
  state.user.notifs.unshift({ title: 'Appointment cancelled', text: 'Your visit was cancelled.', when: 'Just now', unread: false, go: 'appts' });
  showToast('Appointment cancelled');
}

function rescheduleAppointment(id) {
  var removed = removeAppointment(id);
  startBooking(removed ? removed.purpose : 'Payment');
}


// ---------- 7. CORRECTIONS, ANNOUNCEMENTS, NOTIFICATIONS ----------

function submitCorrection() {
  state.errors = {};
  requireField('ctype', 'Choose a type.');
  requireField('cdetails', 'Please describe the problem.');
  if (hasErrors()) { render(); return; }

  db.corrections.push({
    id: nextId(db.corrections),
    homeownerId: state.user.id,
    type: state.form.ctype,
    details: state.form.cdetails,
    date: todayText(),
    status: 'Open'
  });
  state.form = {};
  goBack();
  showToast('Request sent. Staff will review it.');
}

function showArchived(flag) {
  state.showArchived = flag;
  state.openItem = null;
  render();
}

// Tapping a notification: mark it read and open the screen it is about
function openNotif(index) {
  var n = state.user.notifs[index];
  n.unread = false;
  if (n.go) { goTo(n.go); } else { render(); }
}

function markAllRead() {
  var notifs = state.user.notifs;
  for (var i = 0; i < notifs.length; i++) { notifs[i].unread = false; }
  render();
}