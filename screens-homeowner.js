// =====================================================
//  screens-homeowner.js  -  screens for a logged-in HOMEOWNER
//  Home, pay, history, statement, visits, announcements...
//  "me" always means the homeowner who is logged in.
// =====================================================


// ---------- HOME ----------
function screenHome() {
  var me = state.user;
  var owed = totalOwed() + pendingTotal();
  var pending = pendingTotal();

  // the homeowner's next appointment (if any)
  var nextAppt = me.appts[0];

  // the newest announcement that is not archived
  var latestNews = null;
  for (var i = 0; i < db.news.length; i++) {
    if (!db.news[i].archived) { latestNews = db.news[i]; break; }
  }

  var html = homeHeader() + '<div class="body home">';

  // greeting
  html += `<div><div class="muted sm">Good day,</div><h2 style="font-size:20px">${safe(me.first)} ${safe(me.last)}</h2></div>`;

  // the orange balance box
  var note = owed === 0 ? 'You’re all paid up. Thank you!' : 'Month by month below';
  html += `<div class="hero"><small>Outstanding balance</small><div class="big">${peso(owed)}</div><div class="sm">${note}`;
  if (pending > 0) { html += ` · <b>${peso(pending)} sent, waiting for staff to verify (not deducted yet)</b>`; }
  html += '</div></div>';

  // month-by-month breakdown
  html += '<div class="card"><h3 style="margin-bottom:6px">Monthly breakdown</h3>';
  for (var m = 0; m < me.months.length; m++) {
    var month = me.months[m];
    var left = month.due - month.paid;
    var pend = pendingForMonth(month.m);

    // decide the label and its color
    var label = 'Unpaid';
    var color = 'err';
    if (left === 0) { label = 'Settled'; color = 'ok'; }
    else if (pend > 0) { label = 'Pending'; color = 'warn'; }
    else if (month.paid > 0) { label = 'Partial'; color = 'warn'; }

    var detail = peso(month.due) + ' due';
    if (month.paid > 0) { detail += ' · ' + peso(month.paid) + ' paid'; }
    if (pend > 0) { detail += ' · ' + peso(pend) + ' pending verification'; }

    html += `<div class="li">
      <div class="grow"><b>${month.m}</b><div class="xs muted">${detail}</div></div>
      <div style="text-align:right"><div class="amt">${peso(left)}</div><span class="pill ${color}">${label}</span></div>
    </div>`;
  }
  html += '<button class="btn sec" style="margin-top:8px" onclick="switchTab(\'pay\')">Go to payments</button></div>';

  // next appointment
  html += '<div class="card"><div class="row between"><h3>Next appointment</h3><button class="link xs" onclick="switchTab(\'appts\')">Manage</button></div>';
  if (nextAppt) {
    html += `<div class="row" style="margin-top:6px"><div style="color:var(--pri)">${icon('cal', 26)}</div>
      <div><b>${nextAppt.purpose} visit</b><div class="sm muted">${nextAppt.date} · ${nextAppt.time}</div></div></div>`;
  } else {
    html += '<div class="sm muted" style="margin-top:6px">No upcoming appointment.</div>';
  }
  html += '</div>';

  // latest announcement
  html += '<div class="card"><div class="row between"><h3>Latest announcement</h3><button class="link xs" onclick="goTo(\'announce\')">See all</button></div>';
  if (latestNews) {
    html += `<div style="margin-top:6px"><b class="sm">${safe(latestNews.title)}</b><div class="xs muted">${latestNews.date}</div></div>`;
  } else {
    html += '<div class="sm muted">No announcements.</div>';
  }
  html += '</div>';

  // four shortcut tiles
  html += `<div class="tiles">
    <button class="tile" onclick="goTo('statement')"><span>${icon('doc', 24)}</span><b>Statement of account</b><small class="xs muted">View &amp; download</small></button>
    <button class="tile" onclick="goTo('history')"><span>${icon('receipt', 24)}</span><b>Payment history</b><small class="xs muted">Receipts</small></button>
    <button class="tile" onclick="goTo('faq')"><span>${icon('help', 24)}</span><b>FAQ</b><small class="xs muted">Quick answers</small></button>
    <button class="tile" onclick="goTo('correction')"><span>${icon('edit', 24)}</span><b>Spotted an error?</b><small class="xs muted">Request a correction</small></button>
  </div>`;

  html += '</div>' + tabBar();
  return html;
}


// ---------- PAY ----------
function screenPay() {
  var me = state.user;
  var html = pageHeader('Pay dues') + '<div class="body">';
  html += '<div class="banner info xs">Pay through GCash, Maya or bank transfer, then send us the reference number. Staff will check it against the HOA account before it’s marked verified.</div>';
  html += '<div class="sect">Choose what to pay</div>';

  for (var i = 0; i < me.months.length; i++) {
    var month = me.months[i];
    var left = remainingForMonth(month);
    var note = peso(left) + ' remaining of ' + peso(month.due);
    if (left === 0) {
      note = pendingForMonth(month.m) > 0 ? 'Awaiting verification' : 'Settled';
    }
    html += `<div class="opt${left === 0 ? ' dis' : ''}">
      <div class="grow"><b>${month.m}</b><div class="xs muted">${note}</div></div>
      <button class="btn sm" onclick="startPayment('${month.m}')"${left === 0 ? ' disabled' : ''}>Pay</button>
    </div>`;
  }

  html += '<button class="btn ghost" onclick="goTo(\'history\')">View payment history</button>';
  html += '<button class="btn sec" onclick="startBooking(\'Payment\')">Prefer to pay in person? Book an office visit</button>';
  html += '</div>' + tabBar();
  return html;
}


// Step 1 of 3: enter the payment details
function screenPayFlow() {
  var f = state.form;
  var month = findMonth(f.pmonth);
  var html = pageHeader('Send payment details') + '<div class="body">';
  html += '<div class="steps"><i class="on"></i><i></i><i></i></div>';
  html += `<div class="card flat"><b>${month.m}</b><div class="sm muted">Remaining: ${peso(remainingForMonth(month))}</div></div>`;

  html += textField('pamount', 'Amount you paid (₱)', 'number', '', 'min="1" step="1"');
  html += '<div class="xs muted" style="margin-top:-6px">You can pay the full amount or part of it.</div>';
  html += dropdown('pmethod', 'Payment method', ['GCash', 'Maya', 'Bank transfer'], true);

  // once a method is chosen, show where to send the money
  if (f.pmethod) {
    var accountText = 'Sunrise Place HOA · 0917 000 1234';
    var accountCopy = '09170001234';
    if (f.pmethod === 'Bank transfer') {
      accountText = 'Sunrise Place HOA · 0123-4567-89';
      accountCopy = '0123456789';
    }
    html += `<div class="card flat col"><div class="xs muted">Send to the HOA ${f.pmethod} account:</div>
      <div class="copy"><code>${accountText}</code><button class="btn sm sec" onclick="copyText('${accountCopy}')">Copy</button></div></div>`;
  }

  html += textField('pref', 'Reference number', 'text', 'e.g. 7203948110');
  html += textField('pdate', 'Date you paid', 'date', '');
  html += '<button class="btn" onclick="reviewPayment()">Review</button></div>';
  return html;
}


// Step 2 of 3: check everything before sending
function screenReview() {
  var f = state.form;
  var rows = [
    ['Applies to', f.pmonth],
    ['Amount', peso(f.pamount)],
    ['Method', f.pmethod],
    ['Reference no.', f.pref],
    ['Date paid', f.pdate]
  ];
  var html = pageHeader('Review') + '<div class="body">';
  html += '<div class="steps"><i class="on"></i><i class="on"></i><i></i></div>';
  html += '<p class="muted sm" style="margin:0">Check carefully — a wrong digit means staff can’t find your transaction.</p>';
  html += '<div class="card">';
  for (var i = 0; i < rows.length; i++) {
    html += `<div class="li"><span class="muted grow">${rows[i][0]}</span><b class="amt">${safe(rows[i][1])}</b></div>`;
  }
  html += '</div>';
  html += '<button class="btn" onclick="submitPayment()">Submit for verification</button>';
  html += '<button class="btn ghost" onclick="goBack()">Edit</button></div>';
  return html;
}


// Step 3 of 3: done
function screenPayDone() {
  return '<div class="top"><h1>Submitted</h1></div>' + `<div class="body center" style="justify-content:center">
    ${bigBadge('clock', 'warn')}
    <h2>Pending verification</h2>
    <p class="muted sm">We received your payment details. Staff will verify them and you’ll get an email and an in-app notice. Your balance does not change until staff verify the payment. Until then, the amount is shown as pending.</p>
    <button class="btn" onclick="goRoot('home')">Back to home</button>
    <button class="btn ghost" onclick="goTo('history')">View payment history</button>
  </div>`;
}


// ---------- PAYMENT HISTORY ----------
function screenHistory() {
  var me = state.user;

  // newest first (copy the list, then sort the copy)
  var sorted = me.pays.slice().sort(function (a, b) { return b.id - a.id; });

  var html = pageHeader('Payment history') + '<div class="body"><div class="card">';
  for (var i = 0; i < sorted.length; i++) {
    var p = sorted[i];
    var refText = p.ref !== '—' ? ' · Ref ' + safe(p.ref) : '';
    if (p.receipt) { refText += ' · Receipt ' + safe(p.receipt); }
    var reasonText = '';
    if (p.status === 'Rejected' && p.reason) {
      reasonText = '<div class="xs" style="color:var(--err)">Reason: ' + safe(p.reason) + '</div>';
    }
    html += `<div class="li">
      <div class="grow"><b class="sm">${p.month}</b><div class="xs muted">${p.date} · ${p.method}${refText}</div>${reasonText}</div>
      <div style="text-align:right"><div class="amt">${peso(p.amt)}</div>${paymentPill(p.status)}</div>
    </div>`;
  }
  html += '</div>';
  html += '<div class="xs muted center">Receipts are print-friendly. Need a correction? <button class="link xs" onclick="goTo(\'correction\')">Request one</button></div>';
  html += '</div>' + tabBar();
  return html;
}


// ---------- STATEMENT OF ACCOUNT ----------
function screenStatement() {
  var me = state.user;
  var period = state.form.statementPeriod || 'Last 3 months';

  // one row per month: earlier months first, then this homeowner's months
  var rows = [];
  var i;
  for (i = 0; i < EARLIER_MONTHS.length; i++) {
    rows.push({ label: EARLIER_MONTHS[i].m, charged: EARLIER_MONTHS[i].due, paid: EARLIER_MONTHS[i].paid });
  }
  for (i = 0; i < me.months.length; i++) {
    rows.push({ label: me.months[i].m, charged: me.months[i].due, paid: me.months[i].paid });
  }

  // how many months to show
  var count = rows.length;
  if (period === 'Last 3 months') { count = 3; }
  if (period === 'Current month') { count = 1; }
  var shown = rows.slice(Math.max(0, rows.length - count));

  var balance = 0;
  for (i = 0; i < shown.length; i++) { balance = balance + shown[i].charged - shown[i].paid; }

  var options = ['Last 3 months', 'Last 6 months', 'Year to date', 'Current month'];
  var html = pageHeader('Statement of account') + '<div class="body">';
  html += '<label class="f">Period<select onchange="setField(\'statementPeriod\', this.value); render()">';
  for (i = 0; i < options.length; i++) {
    html += '<option' + (period === options[i] ? ' selected' : '') + '>' + options[i] + '</option>';
  }
  html += '</select></label>';

  html += `<div class="pdf"><b>Sunrise Place Homeowners Association</b>
    <div style="margin:2px 0 8px">Statement of Account · ${period}<br>
    ${safe(me.first)} ${safe(me.last)} — Block ${me.block}, Lot ${me.lot}, Phase ${me.phase}<br>As of ${todayText()}</div>
    <table><tr><th>Month</th><th class="r">Charged</th><th class="r">Paid</th></tr>`;
  for (i = 0; i < shown.length; i++) {
    html += `<tr><td>${shown[i].label}</td><td class="r">${peso(shown[i].charged)}</td><td class="r">${peso(shown[i].paid)}</td></tr>`;
  }
  html += `<tr><td colspan="2"><b>Balance</b></td><td class="r"><b>${peso(balance)}</b></td></tr></table></div>`;

  html += '<button class="btn" onclick="downloadStatement()">Download PDF</button>';
  html += '<div class="xs muted center">In the full system this saves a PDF copy to your device.</div>';
  html += '</div>' + tabBar();
  return html;
}


// ---------- OFFICE VISITS ----------
function screenAppts() {
  var me = state.user;
  var html = pageHeader('Office visits') + '<div class="body">';
  html += '<button class="btn" onclick="startBooking(\'\')">Book a visit</button>';

  html += '<div class="sect">Upcoming</div>';
  if (me.appts.length === 0) {
    html += '<div class="card flat sm muted">No upcoming appointments.</div>';
  }
  for (var i = 0; i < me.appts.length; i++) {
    var a = me.appts[i];
    html += `<div class="card col">
      <div class="row between"><b>${a.purpose}</b><span class="pill ok">${a.status}</span></div>
      <div class="sm">${icon('cal', 15)} ${a.date} · ${a.time}</div>`;

    if (state.openItem === a.id) {
      // the person pressed Cancel: ask to confirm
      html += `<div class="banner warn xs">Cancel this appointment? Slots help other homeowners, so thank you for letting us know.</div>
        <div class="row">
          <button class="btn danger sm grow" onclick="cancelAppointment(${a.id})">Yes, cancel</button>
          <button class="btn ghost sm grow" onclick="toggleOpen(${a.id})">Keep</button>
        </div>`;
    } else {
      html += `<div class="row">
          <button class="btn sec sm grow" onclick="rescheduleAppointment(${a.id})">Reschedule</button>
          <button class="btn danger sm grow" onclick="toggleOpen(${a.id})">Cancel</button>
        </div>`;
    }
    html += '<div class="xs muted">Reminders are emailed 1 day before and the morning of your visit.</div></div>';
  }

  html += '<div class="sect">Past</div>';
  for (var j = 0; j < me.pastAppts.length; j++) {
    var p = me.pastAppts[j];
    html += `<div class="li"><div class="grow"><b class="sm">${p.purpose}</b><div class="xs muted">${p.date} · ${p.time}</div></div><span class="pill n">${p.status}</span></div>`;
  }

  html += '<button class="link" onclick="goTo(\'correction\')">Spotted an error in your records? Request a correction</button>';
  html += '</div>' + tabBar();
  return html;
}


// Booking step 1: purpose, day, time
function screenBook() {
  var f = state.form;
  var html = pageHeader('Book a visit') + '<div class="body">';
  html += '<div class="steps"><i class="on"></i><i></i><i></i></div>';
  html += dropdown('bpurpose', 'Purpose', ['Payment', 'Inquiry', 'Document claim', 'Record correction', 'Other'], true);

  // If "Other" is selected, ask the homeowner to explain it
  if (f.bpurpose === 'Other') {
    html += textField(
      'bother',
      'Please specify',
      'text',
      'Vehicle sticker, complaint, permit, etc.'
    );
  }

  html += '<div class="sect">Pick a day</div>';
  for (var i = 0; i < db.days.length; i++) {
    var day = db.days[i];
    if (isDayFull(day)) {
      html += `<div class="opt dis"><div class="grow"><b>${day.label}</b>
        <div class="xs">Fully booked · next open day: ${nextOpenDayLabel(i)}</div></div><span class="pill err">Full</span></div>`;
    } else {
      html += `<label class="opt${f.bday === day.label ? ' on' : ''}">
        <input type="radio" name="bday" value="${day.label}"${f.bday === day.label ? ' checked' : ''}
          onchange="setField('bday', this.value); setField('btime', ''); render()">
        <div class="grow"><b>${day.label}</b><div class="xs muted">${openSlotCount(day)} slots left</div></div></label>`;
    }
  }
  if (state.errors.bday) { html += '<span class="err">' + state.errors.bday + '</span>'; }

  // once a day is chosen, show its time slots
  if (f.bday) {
    var chosenDay = findDay(f.bday);
    html += '<div class="sect">Pick a time</div><div class="tiles">';
    for (var s = 0; s < TIME_SLOTS.length; s++) {
      var open = chosenDay.slotsLeft[s] === 1;
      var cls = 'opt';
      if (!open) { cls += ' dis'; } else if (f.btime === TIME_SLOTS[s]) { cls += ' on'; }
      html += `<label class="${cls}" style="justify-content:center">
        <input type="radio" name="btime" value="${TIME_SLOTS[s]}"${f.btime === TIME_SLOTS[s] ? ' checked' : ''}${open ? '' : ' disabled'}
          onchange="setField('btime', this.value); render()">${TIME_SLOTS[s]}</label>`;
    }
    html += '</div>';
    if (state.errors.btime) { html += '<span class="err">' + state.errors.btime + '</span>'; }
  }

  html += '<button class="btn" onclick="reviewBooking()">Review</button></div>';
  return html;
}


// Booking step 2: check before confirming
function screenBookReview() {
  var f = state.form;
  var purposeText = f.bpurpose;

  if (f.bpurpose === 'Other') {
    purposeText = 'Other - ' + f.bother;
  }

  var rows = [
    ['Purpose', purposeText],
    ['Day', f.bday],
    ['Time', f.btime]
  ];

  var html = pageHeader('Review booking') + '<div class="body">';
  html += '<div class="steps"><i class="on"></i><i class="on"></i><i></i></div><div class="card">';
  for (var i = 0; i < rows.length; i++) {
    html += `<div class="li"><span class="muted grow">${rows[i][0]}</span><b>${safe(rows[i][1])}</b></div>`;
  }
  html += '</div>';
  if (f.bpurpose === 'Payment') {
    html += '<div class="banner info xs">Bring your payment and a valid ID. Cash or e-wallet accepted at the office.</div>';
  }
  html += '<button class="btn" onclick="confirmBooking()">Confirm booking</button>';
  html += '<button class="btn ghost" onclick="goBack()">Edit</button></div>';
  return html;
}


// Booking step 3: done
function screenBookDone() {
  var f = state.form;
  return '<div class="top"><h1>Booked</h1></div>' + `<div class="body center" style="justify-content:center">
    ${bigBadge('check', 'ok')}
    <h2>You’re booked</h2>
    <p class="muted sm">${safe(f.bpurpose)} visit · ${safe(f.bday)} · ${safe(f.btime)}.<br>We’ll email you a reminder.</p>
    <button class="btn" onclick="goRoot('appts')">View my visits</button>
  </div>`;
}


// ---------- CORRECTION REQUEST ----------
function screenCorrection() {
  var f = state.form;
  var html = pageHeader('Request a correction') + '<div class="body">';
  html += '<p class="muted sm" style="margin:0">Tell us what looks wrong in your records. Staff will review it; financial corrections also need admin approval.</p>';
    html += dropdown('ctype', 'What needs fixing?', ['A payment is missing', 'Wrong amount charged', 'Wrong personal details', 'Other'], true);
  if (f.ctype === 'Wrong personal details') {
    html += '<div class="banner info xs">Changes to your name, block, lot, phase or email must be done in person at the HOA office, with a supporting document (for example a valid ID, marriage certificate or transfer papers). You can ask here to update your phone number.</div>';
  }
  html += '<label class="f">Details';
  html += '<textarea id="cdetails" placeholder="Month, amount, reference number, etc." oninput="setField(this.id, this.value)"' + (state.errors.cdetails ? ' class="bad"' : '') + '>' + safe(f.cdetails || '') + '</textarea>';
  if (state.errors.cdetails) { html += '<span class="err">' + state.errors.cdetails + '</span>'; }
  html += '</label>';
  html += '<button class="btn" onclick="submitCorrection()">Submit request</button></div>';
  return html;
}


// ---------- ANNOUNCEMENTS ----------
function screenAnnounce() {
  var html = pageHeader('Announcements') + '<div class="body">';
  html += `<div class="row">
    <button class="btn sm${state.showArchived ? ' ghost' : ''}" onclick="showArchived(false)">Current</button>
    <button class="btn sm${state.showArchived ? '' : ' ghost'}" onclick="showArchived(true)">Archived</button>
  </div>`;

  var shownCount = 0;
  for (var i = 0; i < db.news.length; i++) {
    var n = db.news[i];
    if (n.archived !== state.showArchived) { continue; }
    shownCount = shownCount + 1;
    var editedText = n.edited ? ' · Edited ' + n.edited : '';
    html += `<div class="card"><button class="link" style="width:100%;color:var(--fg)" onclick="toggleOpen(${n.id})">
      <b>${safe(n.title)}</b><div class="xs muted" style="font-weight:400">${n.date}${editedText}</div></button>`;
    if (state.openItem === n.id) { html += '<p class="sm" style="margin:8px 0 0">' + safe(n.body) + '</p>'; }
    html += '</div>';
  }
  if (shownCount === 0) { html += '<div class="muted sm">Nothing here.</div>'; }

  html += '<div class="xs muted center">Old announcements are archived, never deleted.</div>';
  html += '</div>' + tabBar();
  return html;
}


// ---------- NOTIFICATIONS ----------
// What the link under each notification says
var NOTIF_LABELS = {
  history: 'View payment history',
  announce: 'View announcements',
  appts: 'View my visits',
  myrequests: 'View my requests'
};

function screenNotifs() {
  var me = state.user;
  var html = pageHeader('Notifications') + '<div class="body">';
  for (var i = 0; i < me.notifs.length; i++) {
    var n = me.notifs[i];
    var inside = `<div class="row between"><b class="sm">${safe(n.title)}</b>${n.unread ? '<span class="pill warn">New</span>' : ''}</div>
      <div class="sm muted" style="font-weight:400">${safe(n.text)}</div><div class="xs muted" style="font-weight:400">${n.when}</div>`;

    if (n.go) {
      // a notification that opens a screen when tapped
      html += `<div class="card"><button class="link" style="width:100%;color:var(--fg)" onclick="openNotif(${i})">${inside}
        <div class="xs" style="color:var(--pri);margin-top:4px">${NOTIF_LABELS[n.go]} →</div></button></div>`;
    } else {
      html += '<div class="card">' + inside + '</div>';
    }
  }
  if (me.notifs.length === 0) { html += '<div class="muted sm">No notifications yet.</div>'; }
  html += '<button class="btn sec" onclick="markAllRead()">Mark all as read</button></div>' + tabBar();
  return html;
}


// ---------- CONTACT ----------
function screenContact() {
  return pageHeader('Contact the HOA') + `<div class="body">
    <div class="card col">
      <h3>Office hours</h3><div class="sm">Mon–Fri, 9:00 AM – 4:00 PM</div>
      <div class="sect">Email</div>
      <div class="copy"><code>hoa.sunriseplace@example.com</code><button class="btn sm sec" onclick="copyText('hoa.sunriseplace@example.com')">Copy</button></div>
      <div class="sect">Phone</div>
      <div class="copy"><code>(046) 000-0000</code><button class="btn sm sec" onclick="copyText('(046) 000-0000')">Copy</button></div>
    </div>
    <button class="btn" onclick="goTo('correction')">Send an inquiry</button>
    <button class="btn ghost" onclick="goTo('faq')">Read the FAQ</button>
  </div>` + tabBar();
}


// ---------- FAQ ----------
function screenFaq() {
  var questions = [
    ['How do I pay my dues online?', 'Open Pay, choose the month, send via GCash, Maya or bank, then enter the reference number. Staff verify it against the HOA record.'],
    ['Why is my payment “pending”?', 'Staff manually check each reference number. You’ll be notified once verified.'],
    ['Can I pay part of a month?', 'Yes. Enter the amount you paid and choose which month it applies to.'],
    ['Can I cancel an appointment?', 'Yes, any time. Please cancel early so others can use the slot.']
  ];
  var html = pageHeader('FAQ') + '<div class="body">';
  for (var i = 0; i < questions.length; i++) {
    var key = 'faq' + i;
    html += `<div class="card"><button class="link" style="width:100%;color:var(--fg);font-weight:700" onclick="toggleOpen('${key}')">${questions[i][0]}</button>`;
    if (state.openItem === key) { html += `<p class="sm muted" style="margin:6px 0 0">${questions[i][1]}</p>`; }
    html += '</div>';
  }
  html += '<button class="btn ghost" onclick="goTo(\'correction\')">Still stuck? Send an inquiry</button></div>' + tabBar();
  return html;
}


// ---------- PROFILE ----------
function screenProfile() {
  var me = state.user;
  var html = pageHeader('Profile') + '<div class="body">';
  html += `<div class="card row">
    <div class="ib" style="width:52px;height:52px;display:grid;place-items:center;background:var(--pri-soft);color:var(--pri)">${icon('user', 26)}</div>
    <div class="grow"><b>${safe(me.first)} ${safe(me.middle)} ${safe(me.last)}</b>
      <div class="xs muted">${safe(me.email)}</div>
      <div class="xs muted">Block ${me.block} · Lot ${me.lot} · Phase ${me.phase}</div></div>
  </div>`;

  html += '<div class="sect">Login activity</div><div class="card">';
  for (var i = 0; i < state.sessions.length; i++) {
    html += `<div class="li"><div class="grow sm">${state.sessions[i].device}</div><span class="xs muted">${state.sessions[i].when}</span></div>`;
  }
  html += '</div>';

  html += '<button class="btn sec" onclick="goTo(\'myrequests\')">My correction requests</button>';
  html += '<button class="btn danger" onclick="logoutAll()">Log out of all devices</button>';
  html += '<button class="btn ghost" onclick="logout()">Log out</button>';
  html += '</div>' + tabBar();
  return html;
}

// ---------- MY CORRECTION REQUESTS ----------
function screenMyRequests() {
  var me = state.user;
  var html = pageHeader('My correction requests') + '<div class="body">';

  var count = 0;
  // newest first
  for (var i = db.corrections.length - 1; i >= 0; i--) {
    var c = db.corrections[i];
    if (c.homeownerId !== me.id) { continue; }
    count = count + 1;
    html += `<div class="card col">
      <div class="row between"><b class="sm">${safe(c.type)}</b><span class="pill ${c.status === 'Open' ? 'warn' : 'ok'}">${c.status}</span></div>
      <div class="xs muted">${c.date}</div>
      <div class="sm">${safe(c.details)}</div>`;
    if (c.response) {
      html += `<div class="banner ok xs"><b>Reply from the HOA office:</b><br>${safe(c.response)}</div>`;
    } else {
      html += '<div class="xs muted">Waiting for the HOA office to review.</div>';
    }
    html += '</div>';
  }
  if (count === 0) { html += '<div class="card flat center sm muted">You have not sent any requests yet.</div>'; }

  html += '<button class="btn" onclick="goTo(\'correction\')">Send a new request</button>';
  html += '</div>' + tabBar();
  return html;
}