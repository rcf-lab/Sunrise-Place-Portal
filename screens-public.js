// =====================================================
//  screens-public.js  -  screens BEFORE logging in
//  Welcome, log in, forgot password, register.
//  Each function returns the HTML (the "picture") of one screen.
// =====================================================


function screenWelcome() {
  return `<div class="body center" style="justify-content:center;gap:18px">
    <span class="lg" style="padding:10px 14px">
      <img style="height:auto;width:250px;max-width:100%" src="logo.png" alt="Sunrise Place Homeowners Association Inc.">
    </span>
    <h1 style="margin:0;font-size:19px">Dues Management &amp; Homeowners Portal</h1>
    <p class="muted sm" style="max-width:290px;margin:0">See your monthly dues, send payment details, book an office visit and read HOA announcements — all in one place.</p>
    <div class="col" style="width:100%;margin-top:6px">
      <button class="btn" onclick="goTo('login')">Log in</button>
      <button class="btn ghost" onclick="goTo('register')">Register as homeowner</button>
    </div>
    <div class="xs muted" style="margin-top:8px">Sunrise Place Homeowners Association · Tanza, Cavite</div>
  </div>`;
}


function screenLogin() {
  var html = pageHeader('Log in') + '<div class="body">';

  if (state.loginFails >= 5) {
    html += '<div class="banner err">Too many attempts. Please wait 15 minutes before trying again.</div>';
  }
  if (state.errors.login) {
    html += '<div class="banner err" role="alert">' + state.errors.login + '</div>';
  }

  html += textField('lemail', 'Email', 'email', 'you@example.com', 'autocomplete="username"');
  html += textField('lpass', 'Password', 'password', 'Your password', 'autocomplete="current-password"');
  html += '<button class="btn" onclick="doLogin()"' + (state.loginFails >= 5 ? ' disabled' : '') + '>Log in</button>';
  html += '<button class="link" onclick="goTo(\'forgot\')">Forgot password?</button>';
  html += '<button class="link" onclick="goTo(\'register\')">Don’t have an account? Register</button>';

  html += `<div class="banner info xs"><b>Prototype demo only.</b> These sample accounts will not exist in the real system.<br>
    Homeowner: <b>santos@example.com</b> / <b>Sunrise2026</b><br>
    Staff: <b>staff@example.com</b> / <b>Staff2026</b><br>
    Admin: <b>admin@example.com</b> / <b>Admin2026</b></div>`;
  html += '<button class="link xs" onclick="resetDemoData()">Reset demo data</button>';
  html += '<div class="xs muted">Demo only: this button clears the saved sample data. It will be removed in the real system.</div>';

  html += '</div>';
  return html;
}


function screenForgot() {
  var html = pageHeader('Forgot password') + '<div class="body">';
  html += '<p class="muted sm" style="margin:0">Enter the email you registered with. If it matches an account, we’ll send a link to reset your password.</p>';
  html += textField('femail', 'Email', 'email', 'you@example.com');
  html += '<button class="btn" onclick="doForgot()">Send reset link</button>';
  html += '</div>';
  return html;
}


function screenForgotDone() {
  return '<div class="top"><h1>Check your email</h1></div>' + `<div class="body center" style="justify-content:center">
    ${bigBadge('mail', 'pri')}
    <h2>Reset link sent</h2>
    <p class="muted sm">If an account exists for that email, a reset link is on its way. The link expires in 30 minutes and works once.</p>
    <button class="btn" onclick="goRoot('login')">Back to log in</button>
  </div>`;
}


function screenRegister() {
  var html = pageHeader('Homeowner registration') + '<div class="body">';
  html += '<div class="banner info xs">Online accounts are for homeowners already on the HOA’s records. Type your name and unit exactly as the office has them, and the activation code the office gave you after checking your ID. Your account is then linked to your existing record.</div>';

  html += '<div class="sect">Personal details</div>';
  html += textField('rfirst', 'First name', 'text', 'Maria');
  html += textField('rmid', 'Middle name (optional)', 'text', '');
  html += textField('rlast', 'Last name', 'text', 'Santos');
  html += textField('rphone', 'Phone number (optional)', 'tel', '09XX XXX XXXX');

  html += '<div class="sect">Account details</div>';
  html += textField('remail', 'Email (required)', 'email', 'you@example.com');
  html += textField('rpass', 'Password', 'password', 'At least 8 characters');
  html += textField('rpass2', 'Confirm password', 'password', '');

  html += '<div class="sect">Address details</div>';
  html += '<div class="row">' + textField('rblock', 'Block', 'number', '5') + textField('rlot', 'Lot', 'number', '12') + '</div>';
  html += dropdown('rphase', 'Phase', ['1', '2', '3']);
  html += textField('rcode', 'Activation code', 'text', 'Given by HOA office');
    html += '<div class="xs muted">Prototype demo only: Grace Villanueva · Block 9 · Lot 2 · Phase 3 · code <b>SP-4821</b>. In the real system, the office gives the code to the homeowner in person.</div>';

  html += '<label class="chk"><input type="checkbox" id="rterms" onchange="setField(this.id, this.checked)"' + (state.form.rterms ? ' checked' : '') + '>';
  html += '<span>I agree to the <button type="button" class="link" style="display:inline;padding:0" onclick="goTo(\'terms\')">Terms &amp; Conditions</button> and <button type="button" class="link" style="display:inline;padding:0" onclick="goTo(\'privacy\')">Privacy Policy</button>.';
  if (state.errors.rterms) { html += '<br><span class="err">' + state.errors.rterms + '</span>'; }
  html += '</span></label>';

  html += '<button class="btn" onclick="doRegister()">Create account</button>';
  html += '</div>';
  return html;
}


function screenRegDone() {
  return '<div class="top"><h1>Registration</h1></div>' + `<div class="body center" style="justify-content:center">
    ${bigBadge('check', 'ok')}
    <h2>Account created</h2>
    <p class="muted sm">
      Your details matched existing HOA records and your online account has now been linked to them.
      Any dues, payment history and HOA records that existed before registration will already appear in your account.
      You can now log in using your email and password.
    </p>
    <button class="btn" onclick="goRoot('login')">Go to log in</button>
  </div>`;
}


// ---------- TERMS AND PRIVACY (sample text for the prototype) ----------

function screenTerms() {
  return pageHeader('Terms & Conditions') + `<div class="body">
    <div class="banner info xs">Sample text for this prototype. The real wording would come from the HOA board.</div>
    <div class="card col">
      <h3>1. Who may use the portal</h3>
      <p class="sm muted" style="margin:0">The portal is for homeowners of Sunrise Place Subdivision whose records are held by the HOA office, and for HOA staff and administrators.</p>
      <h3>2. Your account</h3>
      <p class="sm muted" style="margin:0">Keep your password private. You are responsible for activity under your account. The activation code works only once.</p>
      <h3>3. Payments</h3>
      <p class="sm muted" style="margin:0">The portal does not handle money. When you send payment details, the HOA office checks them against its own account and marks the payment verified or rejected. A payment is final only after staff verify it.</p>
      <h3>4. Accurate information</h3>
      <p class="sm muted" style="margin:0">Enter correct reference numbers and details. If you see a mistake in your records, send a correction request.</p>
      <h3>5. Changes</h3>
      <p class="sm muted" style="margin:0">The HOA may update these terms. Important changes will be posted as an announcement.</p>
    </div>
    <button class="btn" onclick="goBack()">Back to registration</button>
  </div>`;
}

function screenPrivacy() {
  return pageHeader('Privacy Policy') + `<div class="body">
    <div class="banner info xs">Sample text for this prototype, written with the Data Privacy Act of 2012 (RA 10173) in mind. The HOA board would finalize the real wording.</div>
    <div class="card col">
      <h3>What we collect</h3>
      <p class="sm muted" style="margin:0">Your name, block, lot and phase, email, phone number, payment records and office visit bookings.</p>
      <h3>Why we collect it</h3>
      <p class="sm muted" style="margin:0">To show your dues and payment history, verify payments, schedule office visits and send you HOA announcements.</p>
      <h3>Who can see it</h3>
      <p class="sm muted" style="margin:0">You can see only your own records. HOA staff and administrators can see homeowner records to do their work, and every change they make is written in an audit trail.</p>
      <h3>How long we keep it</h3>
      <p class="sm muted" style="margin:0">Records are kept while you are a homeowner in the subdivision, and as long as the HOA needs them for its accounts.</p>
      <h3>Your rights</h3>
      <p class="sm muted" style="margin:0">You may ask the HOA office to see, correct or update your information. Use “Request a correction” in the app or visit the office.</p>
    </div>
    <button class="btn" onclick="goBack()">Back to registration</button>
  </div>`;
}