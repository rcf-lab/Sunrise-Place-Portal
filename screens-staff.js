// =====================================================
//  screens-staff.js  -  screens for STAFF and ADMIN
//  Staff: dashboard, payments, visits, homeowners, corrections.
//  Admin: everything staff can do, plus announcements,
//  staff accounts and the audit trail.
// =====================================================


// ---------- 1. TAB BAR AND HEADER ----------

var STAFF_TABS = [
  { key: 'staffHome', icon: 'home', label: 'Home' },
  { key: 'staffPay', icon: 'card', label: 'Payments' },
  { key: 'staffVisits', icon: 'cal', label: 'Visits' },
  { key: 'staffPeople', icon: 'user', label: 'Homeowners' },
  { key: 'staffMore', icon: 'doc', label: 'More' }
];

// Which tab lights up on which screen
var STAFF_TAB_FOR = {
  staffHome: 'staffHome',
  staffPay: 'staffPay',
  staffVisits: 'staffVisits',
  staffPeople: 'staffPeople',
  staffMore: 'staffMore',
  staffCorrections: 'staffMore',
  adminNews: 'staffMore',
  adminAccounts: 'staffMore',
  adminAudit: 'staffMore'
};

function staffTabBar() {
  var current = STAFF_TAB_FOR[state.screen];
  var html = '<nav class="tabs" aria-label="Main">';
  for (var i = 0; i < STAFF_TABS.length; i++) {
    var tab = STAFF_TABS[i];
    var on = current === tab.key;
    html += '<button class="tab' + (on ? ' on' : '') + '" onclick="switchTab(\'' + tab.key + '\')"' + (on ? ' aria-current="page"' : '') + '>';
    html += '<span>' + icon(tab.icon) + '</span>' + tab.label + '</button>';
  }
  html += '</nav>';
  return html;
}

// Top bar for the main staff screens: title + role label
function staffHeader(title) {
  var pillColor = state.role === 'admin' ? 'ok' : 'n';
  return '<div class="top"><h1>' + title + '</h1><span class="pill ' + pillColor + '">' + state.role + '</span></div>';
}


// A big text box with a label (same idea as textField, but for longer text)
function textArea(id, label, placeholder) {
  var error = state.errors[id];
  var html = '<label class="f">' + label;
  html += '<textarea id="' + id + '" placeholder="' + placeholder + '" oninput="setField(this.id, this.value)"' + (error ? ' class="bad"' : '') + '>' + safe(state.form[id] || '') + '</textarea>';
  if (error) { html += '<span class="err">' + error + '</span>'; }
  html += '</label>';
  return html;
}


// ---------- 2. DASHBOARD ----------

function screenStaffHome() {
  var waiting = allPendingPayments().length;
  var visits = allAppointments().length;
  var fixes = openCorrectionCount();

  var owing = 0;
  var totalOwed = 0;
  for (var i = 0; i < db.homeowners.length; i++) {
    var owed = owedBy(db.homeowners[i]);
    if (owed > 0) { owing = owing + 1; totalOwed = totalOwed + owed; }
  }

  var html = staffHeader(state.role === 'admin' ? 'Admin dashboard' : 'Staff dashboard') + '<div class="body">';
  html += `<div><div class="muted sm">Welcome back,</div><h2 style="font-size:20px">${safe(state.user.name)}</h2></div>`;

  html += `<div class="hero"><small>Unpaid dues across all homeowners</small><div class="big">${peso(totalOwed)}</div>
    <div class="sm">${owing} of ${db.homeowners.length} homeowners still owe something</div></div>`;

  // just the numbers (the menu already has the buttons)
  html += `<div class="tiles">
    <div class="tile" style="cursor:default"><span>${waiting}</span><b>Payments to verify</b></div>
    <div class="tile" style="cursor:default"><span>${visits}</span><b>Upcoming visits</b></div>
    <div class="tile" style="cursor:default"><span>${fixes}</span><b>Open correction requests</b></div>
    <div class="tile" style="cursor:default"><span>${owing}</span><b>Homeowners with dues</b></div>
  </div>`;

  // the last few things the office did
  html += '<div class="sect">Recent activity</div><div class="card">';
  if (db.audit.length === 0) {
    html += '<div class="sm muted">Nothing yet. Verify a payment and it will show here.</div>';
  }
  for (var k = 0; k < db.audit.length && k < 5; k++) {
    html += `<div class="li"><div class="grow"><div class="sm">${safe(db.audit[k].action)}</div>
      <div class="xs muted">${safe(db.audit[k].who)} · ${db.audit[k].when}</div></div></div>`;
  }
  html += '</div>';

  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 3. PAYMENTS TO VERIFY ----------

function screenStaffPay() {
  var queue = allPendingPayments();
  var html = staffHeader('Payments') + '<div class="body">';
  html += '<div class="banner info xs">Check each reference number against the HOA GCash, Maya or bank statement before you press Verify. The system never touches the money — it only records what you confirm.</div>';
  html += '<div class="sect">Waiting for verification (' + queue.length + ')</div>';

  if (queue.length === 0) {
    html += '<div class="card flat center sm muted">All caught up. No payments are waiting.</div>';
  }

  for (var i = 0; i < queue.length; i++) {
    var owner = queue[i].owner;
    var pay = queue[i].pay;
    var duplicate = duplicateOwner(pay);

    html += `<div class="card col">
      <div class="row between"><b>${safe(ownerName(owner))}</b><span class="amt">${peso(pay.amt)}</span></div>
      <div class="xs muted">${unitText(owner)}</div>
      <div class="sm">${pay.month} · ${pay.method}<br>Ref <b>${safe(pay.ref)}</b> · paid ${pay.date}</div>`;

    if (duplicate !== null) {
      html += `<div class="banner err xs"><b>Possible duplicate.</b> This reference number is already on a payment from ${safe(ownerName(duplicate))}. Check the HOA statement before verifying.</div>`;
    }

    var panelKey = 'rej' + owner.id + '-' + pay.id;
    html += `<div class="row">
        <button class="btn sm grow" onclick="verifyPayment(${owner.id}, ${pay.id})">Verify</button>
        <button class="btn danger sm grow" onclick="togglePanel('${panelKey}')">Reject</button>
      </div>`;

    // the little form that opens when Reject is pressed
    if (state.panel === panelKey) {
      html += '<div class="card flat col">';
      html += dropdown('rreason', 'Why is it being rejected?', REJECT_REASONS);
      html += textField('rnote', 'Note for the homeowner (optional)', 'text', 'e.g. Please check the last 4 digits');
      html += `<div class="row">
          <button class="btn danger sm grow" onclick="rejectPayment(${owner.id}, ${pay.id})">Confirm reject</button>
          <button class="btn ghost sm grow" onclick="togglePanel('${panelKey}')">Cancel</button>
        </div></div>`;
    }
    html += '</div>';
  }

  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 4. OFFICE VISITS ----------

function screenStaffVisits() {
  var visits = allAppointments();
  var html = staffHeader('Office visits') + '<div class="body">';
  html += '<div class="sect">Upcoming (' + visits.length + ')</div>';

  if (visits.length === 0) {
    html += '<div class="card flat center sm muted">No upcoming visits.</div>';
  }

  for (var i = 0; i < visits.length; i++) {
    var owner = visits[i].owner;
    var appt = visits[i].appt;
    html += `<div class="card col">
      <div class="row between"><b>${safe(ownerName(owner))}</b><span class="pill ok">${appt.purpose}</span></div>
      <div class="xs muted">${unitText(owner)}</div>
      <div class="sm">${icon('cal', 15)} ${appt.date} · ${appt.time}</div>
      <div class="row">
        <button class="btn sm grow" onclick="finishVisit(${owner.id}, ${appt.id}, 'Completed')">Completed</button>
        <button class="btn ghost sm grow" onclick="finishVisit(${owner.id}, ${appt.id}, 'No-show')">No-show</button>
      </div></div>`;
  }

  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 5. HOMEOWNERS LIST ----------

function screenStaffPeople() {
  var filter = state.form.hfilter || 'all';

  var html = staffHeader('Homeowners') + '<div class="body">';

  html += '<label class="f">Search<input type="text" id="hsearch" placeholder="Name or email" value="' + safe(state.form.hsearch || '') + '" oninput="staffSearch(this.value)"></label>';
  html += `<div class="row">
    <button class="btn sm${filter === 'all' ? '' : ' ghost'}" onclick="setField('hfilter', 'all'); render()">All</button>
    <button class="btn sm${filter === 'owes' ? '' : ' ghost'}" onclick="setField('hfilter', 'owes'); render()">Owes dues</button>
  </div>`;

  // the list sits in its own box, so searching can redraw just the list
  html += '<div class="col" id="peopleList">' + peopleListHtml() + '</div>';

  html += '</div>' + staffTabBar();
  return html;
}

// The list of homeowners (filtered by the search box and the All / Owes dues buttons)
function peopleListHtml() {
  var search = (state.form.hsearch || '').trim().toLowerCase();
  var filter = state.form.hfilter || 'all';
  var html = '';

  var shown = 0;
  for (var i = 0; i < db.homeowners.length; i++) {
    var owner = db.homeowners[i];
    var owed = owedBy(owner);

    // skip people who do not match the search or the filter
    var haystack = (ownerName(owner) + ' ' + owner.email.split('@')[0]).toLowerCase();
    if (search !== '' && haystack.indexOf(search) < 0) { continue; }
    if (filter === 'owes' && owed === 0) { continue; }
    shown = shown + 1;

    var key = 'own' + owner.id;
    html += `<div class="card"><button class="link" style="width:100%;color:var(--fg)" onclick="toggleOpen('${key}')">
      <div class="row between"><b>${safe(ownerName(owner))}</b>
        <span class="pill ${owed > 0 ? 'warn' : 'ok'}">${owed > 0 ? 'Owes ' + peso(owed) : 'Settled'}</span></div>
      <div class="xs muted" style="font-weight:400">${unitText(owner)}${owner.claimed === false ? ' · No online account yet' : ''}</div></button>`;

    if (state.openItem === key) { html += ownerDetails(owner); }
    html += '</div>';
  }

  if (shown === 0) { html += '<div class="muted sm center">No homeowners match.</div>'; }
  return html;
}

// The form that opens when "Edit details" is pressed
function editDetailsForm(owner) {
  var isAdmin = state.role === 'admin';
  var lock = isAdmin ? '' : 'disabled';
  var tag = isAdmin ? '' : ' (admin only)';
  var html = '<div class="card flat col">';

  if (!isAdmin) {
    html += '<div class="banner info xs">Staff can change the phone number. Name, block, lot, phase and email can only be changed by an admin, who must check a supporting document.</div>';
  } else {
    html += '<div class="banner info xs">Name, block, lot, phase and email need a supporting document. Check it in person before you save.</div>';
  }

  html += textField('ephone', 'Phone number', 'tel', 'Optional');
  html += textField('efirst', 'First name' + tag, 'text', '', lock);
  html += textField('elast', 'Last name' + tag, 'text', '', lock);
  html += textField('eblock', 'Block' + tag, 'number', '', lock + ' min="1"');
  html += textField('elot', 'Lot' + tag, 'number', '', lock + ' min="1"');
  html += textField('ephase', 'Phase' + tag, 'number', '', lock + ' min="1"');
  if (owner.claimed !== false) {
    html += textField('eemail', 'Email' + tag, 'email', '', lock);
  }
  if (isAdmin) {
    html += dropdown('edoc', 'Document checked (needed for name, unit or email changes)', EDIT_DOCUMENTS);
  }
  html += textArea('enote', 'Reason for the change', 'e.g. Homeowner asked for a new number');
  html += `<div class="row">
      <button class="btn sm grow" onclick="saveDetails(${owner.id})">Save changes</button>
      <button class="btn ghost sm grow" onclick="togglePanel('edit${owner.id}')">Cancel</button>
    </div></div>`;
  return html;
}

// The part that opens when you tap a homeowner
function ownerDetails(owner) {
  var html = '<div class="col reveal" style="margin-top:8px">';
  if (owner.claimed === false) {
  html += `<div class="banner info xs"><b>No online account yet.</b> After you check the homeowner’s ID, give them this activation code: <b>${safe(owner.code)}</b>. It works only once.</div>`;
  } else {
  html += `<div class="xs muted">${safe(owner.email)}${owner.phone ? ' · ' + safe(owner.phone) : ''}</div>`;
  }
  html += `<button class="btn sm sec" onclick="openEditPanel(${owner.id})">Edit details</button>`;
  if (state.panel === 'edit' + owner.id) { html += editDetailsForm(owner);
  }
  
  html += '<div class="sect">Months</div>';

  for (var i = 0; i < owner.months.length; i++) {
    var month = owner.months[i];
    var pending = pendingFor(owner, month.m);
    var left = month.due - month.paid - pending;
    var note = peso(month.paid) + ' paid of ' + peso(month.due);
    if (pending > 0) { note += ' · ' + peso(pending) + ' pending'; }

    html += `<div class="li"><div class="grow"><b class="sm">${month.m}</b><div class="xs muted">${note}</div></div>`;
    if (left > 0) { html += `<span class="pill warn">Owes ${peso(left)}</span>`; }
    else if (pending > 0) { html += '<span class="pill warn">Pending</span>'; }
    else { html += '<span class="pill ok">Covered</span>'; }
    html += '</div>';
  }

  // one cash form for the whole balance (it can cover several months)
  var due = cashDue(owner);
  var cashKey = 'cash' + owner.id;
  if (due > 0) {
    html += `<button class="btn sm sec" onclick="openCashPanel(${owner.id})">Record cash payment</button>`;
  }
  if (state.panel === cashKey) {
    html += '<div class="card flat col">';
    html += textField('camount', 'Amount received (₱)', 'number', '', 'min="1" step="1"');
    html += textField('creceipt', 'Official receipt number', 'text', 'e.g. OR-0153');
    html += `<div class="xs muted">The money pays the oldest unpaid month first. Write the same receipt number on the paper receipt you hand to the homeowner.</div>
      <div class="row">
        <button class="btn sm grow" onclick="recordCash(${owner.id})">Save cash payment</button>
        <button class="btn ghost sm grow" onclick="togglePanel('${cashKey}')">Cancel</button>
      </div></div>`;
  }

  html += '<div class="sect">Recent payments</div>';
  if (owner.pays.length === 0) { html += '<div class="xs muted">No payments yet.</div>'; }
  var recent = owner.pays.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 3);
  for (var j = 0; j < recent.length; j++) {
    var p = recent[j];
    html += `<div class="li"><div class="grow"><b class="sm">${p.month}</b><div class="xs muted">${p.date} · ${p.method}</div></div>
      <div style="text-align:right"><div class="amt">${peso(p.amt)}</div>${paymentPill(p.status)}</div></div>`;
  }
  html += '</div>';
  return html;
}


// ---------- 6. MORE MENU ----------

function moreRow(screenName, iconName, title, subtitle) {
  return '<button class="link li" style="width:100%;color:var(--fg)" onclick="goTo(\'' + screenName + '\')">' +
    '<span style="color:var(--pri)">' + icon(iconName, 22) + '</span>' +
    '<span class="grow"><b class="sm">' + title + '</b><br><span class="xs muted" style="font-weight:400">' + subtitle + '</span></span>' +
    '<span class="muted">›</span></button>';
}

function screenStaffMore() {
  var fixes = openCorrectionCount();
  var html = staffHeader('More') + '<div class="body"><div class="card">';

  html += moreRow('staffCorrections', 'edit', 'Correction requests', fixes + ' open');
  if (state.role === 'admin') {
    html += moreRow('adminNews', 'bell', 'Announcements', 'Post, edit and archive');
    html += moreRow('adminAccounts', 'user', 'Staff accounts', 'Create and deactivate');
    html += moreRow('adminAudit', 'receipt', 'Audit trail', 'Who did what, and when');
  }
  html += '</div>';

  html += '<button class="btn ghost" onclick="logout()">Log out</button>';
  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 7. CORRECTION REQUESTS ----------

function screenStaffCorrections() {
  var html = pageHeader('Correction requests') + '<div class="body">';

  if (db.corrections.length === 0) {
    html += '<div class="card flat center sm muted">No correction requests yet.</div>';
  }

  // newest first
  for (var i = db.corrections.length - 1; i >= 0; i--) {
    var c = db.corrections[i];
    var owner = findOwnerById(c.homeownerId);
    var name = owner ? ownerName(owner) : 'Unknown homeowner';
    var open = c.status === 'Open';

    html += `<div class="card col">
      <div class="row between"><b>${safe(name)}</b><span class="pill ${open ? 'warn' : 'ok'}">${c.status}</span></div>
      <div class="xs muted">${c.date}${owner ? ' · ' + unitText(owner) : ''}</div>
      <div class="sm"><b>${safe(c.type)}</b><br>${safe(c.details)}</div>`;
    
    if (open && c.type === 'Wrong personal details') {
    html += '<div class="banner info xs">To fix this, open the homeowner’s card in Homeowners and press Edit details. Then come back and send a reply.</div>';
    }
    
    if (open) {
      if (isMoneyCorrection(c) && state.role !== 'admin') {
        html += '<div class="banner info xs">This is about money, so an admin has to approve it.</div>';
      } else if (state.panel === 'res' + c.id) {
        html += '<div class="card flat col">';
        html += textArea('cresp', 'Reply to the homeowner', 'Explain what you did or what the homeowner should do next');
        html += `<div class="row">
            <button class="btn sm grow" onclick="resolveCorrection(${c.id})">Send reply and resolve</button>
            <button class="btn ghost sm grow" onclick="togglePanel('res${c.id}')">Cancel</button>
          </div></div>`;
      } else {
        html += `<button class="btn sm" onclick="togglePanel('res${c.id}')">Reply and resolve</button>`;
      }
    } else if (c.response) {
      html += `<div class="banner ok xs"><b>Reply sent${c.resolvedBy ? ' by ' + safe(c.resolvedBy) : ''}:</b><br>${safe(c.response)}</div>`;
    }
    html += '</div>';
  }

  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 8. ADMIN: ANNOUNCEMENTS ----------

function screenAdminNews() {
  var html = pageHeader('Announcements') + '<div class="body">';

  var editing = state.form.editId ? true : false;
  html += '<div class="sect">' + (editing ? 'Edit announcement' : 'Post a new announcement') + '</div>';
  html += textField('ntitle', 'Title', 'text', 'e.g. Water interruption on Nov 20');
  html += textArea('nbody', 'Message', 'What do homeowners need to know?');
  html += '<button class="btn" onclick="postAnnouncement()">' + (editing ? 'Save changes' : 'Post announcement') + '</button>';
  if (editing) { html += '<button class="btn ghost" onclick="cancelEditNews()">Cancel editing</button>'; }

  html += '<div class="sect">All announcements</div>';
  for (var i = 0; i < db.news.length; i++) {
    var n = db.news[i];
    html += `<div class="card row"><div class="grow"><b class="sm">${safe(n.title)}</b>
      <div class="xs muted">${n.date}${n.edited ? ' · Edited ' + n.edited : ''} · ${n.archived ? 'Archived' : 'Current'}</div></div>
      <button class="btn sm sec" onclick="startEditNews(${n.id})">Edit</button>
      <button class="btn sm ${n.archived ? 'sec' : 'ghost'}" onclick="toggleArchiveNews(${n.id})">${n.archived ? 'Restore' : 'Archive'}</button></div>`;
  }

  html += '<div class="xs muted center">Announcements are archived, never deleted.</div>';
  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 9. ADMIN: STAFF ACCOUNTS ----------

function screenAdminAccounts() {
  var html = pageHeader('Staff accounts') + '<div class="body">';

  html += '<div class="sect">Current accounts</div><div class="card">';
  for (var i = 0; i < db.staff.length; i++) {
    var s = db.staff[i];
    var isMe = s === state.user;
    html += `<div class="li"><div class="grow"><b class="sm">${safe(s.name)}${isMe ? ' (you)' : ''}</b>
      <div class="xs muted">${safe(s.email)} · ${s.role}</div></div>
      <span class="pill ${s.active ? 'ok' : 'err'}">${s.active ? 'Active' : 'Deactivated'}</span>`;
    if (!isMe) {
      html += `<button class="btn sm ${s.active ? 'danger' : 'sec'}" onclick="toggleStaffActive(${s.id})">${s.active ? 'Deactivate' : 'Reactivate'}</button>`;
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="sect">Create a new account</div>';
  html += textField('sname', 'Full name', 'text', 'e.g. Pedro Santos');
  html += textField('semail', 'Email', 'email', 'name@example.com');
  html += dropdown('srole', 'Role', ['staff', 'admin']);
  html += textField('spass', 'Temporary password', 'password', 'At least 8 characters');
  html += textField('sadmin', 'Your password (to confirm it is you)', 'password', 'Your own admin password');
  html += '<button class="btn" onclick="createStaffAccount()">Create account</button>';
  html += '<div class="xs muted">Accounts are deactivated, never deleted, so the audit trail stays complete.</div>';

  html += '</div>' + staffTabBar();
  return html;
}


// ---------- 10. ADMIN: AUDIT TRAIL ----------

function screenAdminAudit() {
  var html = pageHeader('Audit trail') + '<div class="body">';
  html += '<div class="banner info xs">Every payment check, cash entry, announcement and account change is written here with the name of the person who did it.</div>';

  if (db.audit.length === 0) {
    html += '<div class="card flat center sm muted">Nothing recorded yet.</div>';
  } else {
    html += '<div class="card">';
    for (var i = 0; i < db.audit.length; i++) {
      var a = db.audit[i];
      html += `<div class="li"><div class="grow"><div class="sm">${safe(a.action)}</div>
        <div class="xs muted">${safe(a.who)} (${a.role}) · ${a.when}</div></div></div>`;
    }
    html += '</div>';
  }

  html += '</div>' + staffTabBar();
  return html;
}