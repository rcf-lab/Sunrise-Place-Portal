// =====================================================
//  helpers.js  -  small tools used by many screens
//  Icons, money format, safe text, and the pieces
//  every screen shares (top bar, tab bar, form fields).
// =====================================================


// ---------- 1. ICONS ----------
// Each icon is just a drawing described by a few lines (SVG paths).
var ICON_PATHS = {
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/>',
  bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/>',
  receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5l4 4L8 20l-5 1 1-5z"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 7l10 7 10-7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
};

// icon('home', 22) gives back the drawing of a house, 22 pixels wide
function icon(name, size) {
  if (!size) { size = 22; }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[name] + '</svg>';
}

// A big round icon used on "success" screens. color = 'ok', 'warn' or 'pri'
function bigBadge(name, color) {
  return '<div class="badge" style="background:var(--' + color + '-soft);color:var(--' + color + ')">' + icon(name, 38) + '</div>';
}


// ---------- 2. TEXT AND DATES ----------

// Makes text safe to put inside HTML, so typed text can never break the page
function safe(text) {
  if (text === null || text === undefined) { return ''; }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// peso(1500) gives back "₱1,500"
function peso(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Today's date written like "Nov 8, 2026"
function todayText() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Turns "2026-11-08" (from a date box) into "Nov 8, 2026"
function formatDate(isoText) {
  var parts = isoText.split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// The next free id number for a list of records
function nextId(list) {
  var biggest = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id > biggest) { biggest = list[i].id; }
  }
  return biggest + 1;
}


// ---------- 3. DUES MATH (for the logged-in homeowner) ----------

// Is this payment still waiting for staff to check it?
function isPending(payment) {
  return payment.status.indexOf('Pending') === 0;
}

// Total pending money for one month, e.g. pendingForMonth('October 2026')
function pendingForMonth(monthName) {
  var total = 0;
  var pays = state.user.pays;
  for (var i = 0; i < pays.length; i++) {
    if (isPending(pays[i]) && pays[i].month === monthName) { total = total + pays[i].amt; }
  }
  return total;
}

// Total pending money across all months
function pendingTotal() {
  var total = 0;
  var pays = state.user.pays;
  for (var i = 0; i < pays.length; i++) {
    if (isPending(pays[i])) { total = total + pays[i].amt; }
  }
  return total;
}

// How much is still unpaid for one month (pending money counts as "on its way")
function remainingForMonth(month) {
  return month.due - month.paid - pendingForMonth(month.m);
}

// How much the homeowner still owes in total
function totalOwed() {
  var total = 0;
  var months = state.user.months;
  for (var i = 0; i < months.length; i++) {
    total = total + remainingForMonth(months[i]);
  }
  return total;
}

// Find a month record by name, e.g. findMonth('October 2026')
function findMonth(monthName) {
  var months = state.user.months;
  for (var i = 0; i < months.length; i++) {
    if (months[i].m === monthName) { return months[i]; }
  }
  return null;
}

// Number of unread notifications
function unreadCount() {
  var count = 0;
  var notifs = state.user.notifs;
  for (var i = 0; i < notifs.length; i++) {
    if (notifs[i].unread) { count = count + 1; }
  }
  return count;
}

// Has this reference number been used by ANY homeowner? (catches reused screenshots)
function referenceUsed(ref) {
  for (var i = 0; i < db.homeowners.length; i++) {
    var pays = db.homeowners[i].pays;
    for (var j = 0; j < pays.length; j++) {
      if (pays[j].ref === ref) { return true; }
    }
  }
  return false;
}

// The little coloured label for a payment: Verified / Pending / Rejected
function paymentPill(status) {
  if (status === 'Verified') { return '<span class="pill ok">Verified</span>'; }
  if (status === 'Rejected') { return '<span class="pill err">Rejected</span>'; }
  return '<span class="pill warn">Pending</span>';
}


// ---------- 4. OFFICE VISIT DAYS ----------

// How many time slots are still open on a day
function openSlotCount(day) {
  var count = 0;
  for (var i = 0; i < day.slotsLeft.length; i++) {
    if (day.slotsLeft[i] === 1) { count = count + 1; }
  }
  return count;
}

// A day is full if it was closed, or if every slot is taken
function isDayFull(day) {
  return day.full === true || openSlotCount(day) === 0;
}

// Find a day by its label, e.g. findDay('Fri, Oct 16')
function findDay(label) {
  for (var i = 0; i < db.days.length; i++) {
    if (db.days[i].label === label) { return db.days[i]; }
  }
  return null;
}

// The label of the first open day AFTER position "index" (or "none")
function nextOpenDayLabel(index) {
  for (var i = index + 1; i < db.days.length; i++) {
    if (!isDayFull(db.days[i])) { return db.days[i].label; }
  }
  return 'none yet';
}


// ---------- 5. PIECES SHARED BY MANY SCREENS ----------

// A text box with a label. extra = optional extra attributes.
// oninput saves what the person types into state.form
function textField(id, label, type, placeholder, extra) {
  var value = state.form[id] || '';
  var error = state.errors[id];
  var html = '<label class="f">' + label;
  if (type === 'password') { html += '<span class="pw">'; }
  html += '<input id="' + id + '" type="' + type + '" placeholder="' + placeholder + '" value="' + safe(value) + '"';
  html += ' oninput="setField(this.id, this.value)"';
  if (error) { html += ' class="bad"'; }
  if (extra) { html += ' ' + extra; }
  html += '>';
  if (type === 'password') {
    // the Show / Hide button sits inside the box, on the right
    html += '<button type="button" class="pwbtn" aria-label="Show password" onclick="togglePassword(\'' + id + '\', this)">' + icon('eye', 20) + '</button></span>';
  }
  if (error) { html += '<span class="err">' + error + '</span>'; }
  html += '</label>';
  return html;
}

// "Show" / "Hide" button next to a password box
function togglePassword(id, button) {
  var box = document.getElementById(id);
  if (box.type === 'password') {
    box.type = 'text';
    button.innerHTML = icon('eyeoff', 20);
    button.setAttribute('aria-label', 'Hide password');
  } else {
    box.type = 'password';
    button.innerHTML = icon('eye', 20);
    button.setAttribute('aria-label', 'Show password');
  }
}

// A dropdown list with a label. options = list of text choices.
// If redraw is true, the screen redraws when the choice changes.
function dropdown(id, label, options, redraw) {
  var error = state.errors[id];
  var onchange = 'setField(this.id, this.value)';
  if (redraw) { onchange += '; render()'; }
  var html = '<label class="f">' + label;
  html += '<select id="' + id + '" onchange="' + onchange + '"' + (error ? ' class="bad"' : '') + '>';
  html += '<option value="">Select…</option>';
  for (var i = 0; i < options.length; i++) {
    var chosen = state.form[id] === options[i] ? ' selected' : '';
    html += '<option' + chosen + '>' + options[i] + '</option>';
  }
  html += '</select>';
  if (error) { html += '<span class="err">' + error + '</span>'; }
  html += '</label>';
  return html;
}

// The top bar with a Back button and a title
function pageHeader(title) {
  return '<div class="top"><button class="ib" onclick="goBack()" aria-label="Back">←</button><h1>' + safe(title) + '</h1></div>';
}

// The special top bar of the home screen: logo, unit, contact and bell
function homeHeader() {
  var me = state.user;
  var unread = unreadCount();
  var html = '<div class="top">';
  html += '<div class="brand" style="flex-direction:column;align-items:flex-start;gap:3px">';
  html += '<span class="lg"><img src="logo.png" alt="Sunrise Place Homeowners Association"></span>';
  html += '<small>Block ' + me.block + ' · Lot ' + me.lot + ' · Phase ' + me.phase + '</small></div>';
  html += '<button class="ib" onclick="goTo(\'contact\')" aria-label="Contact HOA">' + icon('phone', 20) + '</button>';
  html += '<button class="ib" onclick="goTo(\'notifs\')" aria-label="Notifications, ' + unread + ' unread">' + icon('bell', 20);
  if (unread > 0) { html += '<span class="dot">' + unread + '</span>'; }
  html += '</button></div>';
  return html;
}

// Which tab should light up on which screen
var TAB_FOR = {
  home: 'home', statement: 'home', announce: 'home', notifs: 'home', contact: 'home', faq: 'home',
  pay: 'pay', payflow: 'pay', review: 'pay', paydone: 'pay', history: 'pay',
  appts: 'appts', book: 'appts', bookreview: 'appts', bookdone: 'appts', correction: 'appts',
  profile: 'profile', myrequests: 'profile'
};

var TABS = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'pay', icon: 'card', label: 'Pay' },
  { key: 'appts', icon: 'cal', label: 'Visits' },
  { key: 'profile', icon: 'user', label: 'Profile' }
];

// The bottom tab bar (becomes a side menu on big screens)
function tabBar() {
  var current = TAB_FOR[state.screen];
  var html = '<nav class="tabs" aria-label="Main">';
  for (var i = 0; i < TABS.length; i++) {
    var tab = TABS[i];
    var on = current === tab.key;
    html += '<button class="tab' + (on ? ' on' : '') + '" onclick="switchTab(\'' + tab.key + '\')"' + (on ? ' aria-current="page"' : '') + '>';
    html += '<span>' + icon(tab.icon) + '</span>' + tab.label + '</button>';
  }
  html += '</nav>';
  return html;
}