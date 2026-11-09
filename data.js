// =====================================================
//  data.js  -  the information the app remembers
//  Think of this file as a tiny database.
//  Nothing in here draws anything on the screen.
// =====================================================


// The name used to save our data inside the browser
var STORAGE_KEY = 'sunrise-portal-demo-v3';

// The time slots offered for office visits
var TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

// Months every homeowner already paid in full (shown on statements)
var EARLIER_MONTHS = [
  { m: 'August 2026', due: 100, paid: 100 },
  { m: 'September 2026', due: 100, paid: 100 }
];


// ---------- 1. THE SAMPLE DATA ----------

// Builds ONE sample homeowner.
//   octPaid / novPaid = money already paid for October / November
//   pendingPay = a payment waiting for staff to check (for November), or null for none
function makeHomeowner(id, first, last, block, lot, phase, octPaid, novPaid, pendingPay) {
  var person = {
    id: id,
    first: first,
    middle: '',
    last: last,
    email: first.toLowerCase() + '.' + last.toLowerCase() + '@example.com',
    phone: '',
    block: block,
    lot: lot,
    phase: phase,
    pass: 'Sunrise2026',
    months: [
      { m: 'October 2026', due: 100, paid: octPaid },
      { m: 'November 2026', due: 100, paid: novPaid }
    ],
    pays: [],
    appts: [],
    pastAppts: [],
    notifs: []
  };

  // Everyone paid August and September in full (this matches the Statement of Account)
  person.pays.push({ id: 1, date: 'Aug 8, 2026', month: 'August 2026',
    amt: 100, method: 'Cash (office)', ref: '—', status: 'Verified' });
  person.pays.push({ id: 2, date: 'Sep 9, 2026', month: 'September 2026',
    amt: 100, method: 'GCash', ref: '72030' + id + '0002', status: 'Verified' });

  // A "Verified" payment record for money that was already paid
  if (octPaid > 0) {
    person.pays.push({ id: person.pays.length + 1, date: 'Oct 12, 2026', month: 'October 2026',
      amt: octPaid, method: 'GCash', ref: '72030' + id + '0001', status: 'Verified' });
  }
  if (novPaid > 0) {
    person.pays.push({ id: person.pays.length + 1, date: 'Nov 4, 2026', month: 'November 2026',
      amt: novPaid, method: 'Cash (office)', ref: '—', status: 'Verified' });
  }
  // A payment that staff have not checked yet
  if (pendingPay !== null) {
    person.pays.push({ id: person.pays.length + 1, date: 'Nov 6, 2026', month: 'November 2026',
      amt: pendingPay.amt, method: pendingPay.method, ref: pendingPay.ref, status: 'Pending verification' });
  }
  return person;
}

// Builds a homeowner who is on the HOA's records but has NOT made an online account yet.
// "code" is the activation code the office gives them after checking their ID.
function makeUnclaimed(id, first, last, block, lot, phase, code, octPaid, novPaid) {
  var person = makeHomeowner(id, first, last, block, lot, phase, octPaid, novPaid, null);
  person.email = '';
  person.pass = '';
  person.claimed = false;
  person.code = code;
  return person;
}

// Builds ALL the sample data (used the first time, or after Reset)
function createStartingData() {

  // Maria is the main demo homeowner
  var maria = {
    id: 1,
    first: 'Maria',
    middle: 'Reyes',
    last: 'Santos',
    email: 'santos@example.com',
    phone: '0917 123 4567',
    block: 5,
    lot: 12,
    phase: 2,
    pass: 'Sunrise2026',
    months: [
      { m: 'October 2026', due: 100, paid: 50 },
      { m: 'November 2026', due: 100, paid: 0 }
    ],
    pays: [
      { id: 1, date: 'Aug 6, 2026', month: 'August 2026', amt: 100, method: 'Cash (office)', ref: '—', status: 'Verified' },
      { id: 2, date: 'Sep 5, 2026', month: 'September 2026', amt: 100, method: 'GCash', ref: '7203948110', status: 'Verified' },
      { id: 3, date: 'Oct 14, 2026', month: 'October 2026', amt: 50, method: 'Maya', ref: '5521908834', status: 'Verified' }
    ],
    appts: [
      { id: 1, purpose: 'Payment', date: 'Fri, Nov 13', time: '10:00 AM', status: 'Confirmed' }
    ],
    pastAppts: [
      { purpose: 'Document claim', date: 'Oct 8', time: '2:00 PM', status: 'Completed' }
    ],
    notifs: [
      { title: 'Payment verified', text: 'Your ₱50 payment for October was verified.', when: 'Oct 15', unread: true, go: 'history' },
      { title: 'Appointment reminder', text: 'Payment visit on Fri, Nov 13 at 10:00 AM.', when: 'Today', unread: true, go: 'appts' },
      { title: 'New announcement', text: 'Water interruption on Nov 20.', when: 'Nov 6', unread: false, go: 'announce' }
    ]
  };

  var data = {
    homeowners: [
      maria,
      makeHomeowner(2, 'Jose', 'Cruz', 3, 12, 1, 100, 0, { amt: 100, method: 'GCash', ref: '8841203356' }),
      makeHomeowner(3, 'Elena', 'Garcia', 2, 7, 1, 0, 0, null),
      makeHomeowner(4, 'Paolo', 'Reyes', 8, 3, 3, 100, 100, null),
      makeHomeowner(5, 'Liza', 'Bautista', 1, 20, 1, 100, 50, { amt: 50, method: 'Maya', ref: '6612094471' }),
      makeHomeowner(6, 'Carlo', 'Mendoza', 6, 4, 2, 0, 0, { amt: 100, method: 'GCash', ref: '7203948110' }),
      makeHomeowner(7, 'Rosa', 'Aquino', 4, 15, 2, 100, 100, null),
      makeHomeowner(8, 'Ben', 'Tolentino', 7, 9, 3, 100, 0, null),
      makeUnclaimed(9, 'Grace', 'Villanueva', 9, 2, 3, 'SP-4821', 100, 0),
      makeUnclaimed(10, 'Daniel', 'Ramos', 2, 14, 1, 'SP-7733', 0, 0),
      makeUnclaimed(11, 'Lorna', 'Castillo', 5, 3, 2, 'SP-5190', 100, 100)
    ],

    staff: [
      { id: 1, name: 'Ana Dela Cruz', role: 'staff', email: 'staff@example.com', pass: 'Staff2026', active: true },
      { id: 2, name: 'Ramon Villanueva', role: 'admin', email: 'admin@example.com', pass: 'Admin2026', active: true }
    ],

    // Announcements. archived = true means it is in the "Archived" list
    news: [
      { id: 1, title: 'Water interruption on Nov 20', date: 'Nov 6', archived: false,
        body: 'Maintenance work on the main line will pause water supply on Friday, Nov 20, 2026 from 9:00 AM to 3:00 PM in Phases 1–2. Please store water in advance.' },
      { id: 2, title: 'November dues are due on Nov 15', date: 'Nov 1', archived: false,
        body: 'Reminder: the ₱100 monthly dues for November 2026 are due on Nov 15, 2026. Pay online or book an office visit.' },
      { id: 3, title: 'General Assembly — Oct 28', date: 'Oct 20', archived: true,
        body: 'Minutes of the General Assembly are available at the HOA office.' },
      { id: 4, title: 'Clean-up drive results', date: 'Sep 30', archived: true,
        body: 'Thank you to everyone who joined the clean-up drive.' }
    ],

    // Office visit days. full = true means closed for booking.
    // slotsLeft has one number per time slot: 1 = open, 0 = taken
    days: [
      { label: 'Tue, Nov 10', full: false, slotsLeft: [1, 1, 0, 1, 1, 1] },
      { label: 'Wed, Nov 11', full: true,  slotsLeft: [0, 0, 0, 0, 0, 0] },
      { label: 'Thu, Nov 12', full: false, slotsLeft: [1, 1, 1, 1, 0, 1] },
      { label: 'Fri, Nov 13', full: false, slotsLeft: [1, 0, 1, 1, 1, 1] },
      { label: 'Mon, Nov 16', full: false, slotsLeft: [1, 1, 1, 1, 1, 1] }
    ],

    corrections: [],   // correction requests from homeowners
    audit: []          // history of what staff and admins did (built later)
  };
  return data;
}


// ---------- 2. LOAD AND SAVE ----------

// Reads the saved data from the browser. If nothing is saved, use the sample data.
function loadData() {
  var text = null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch (error) { }

  if (text) {
    try {
      return JSON.parse(text);
    } catch (error) { }
  }
  return createStartingData();
}

// Saves everything into the browser
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) { }
}

// db = the database. Every file can use it.
var db = loadData();


// ---------- 3. THE SCREEN'S MEMORY (not saved) ----------
// What the app is doing right now. It starts fresh on every page load.

var state = {
  screen: 'welcome',     // which screen is showing
  lastScreen: '',        // the screen drawn before (used to keep the scroll position)
  history: [],           // screens visited, so the Back button works
  user: null,            // the person logged in (null = nobody)
  role: null,            // 'homeowner', 'staff' or 'admin'
  form: {},              // what the person has typed so far
  errors: {},            // error messages shown under fields
  loginFails: 0,         // wrong password attempts
  toastText: '',         // the little pop-up message
  showArchived: false,   // announcements: false = current, true = archived
  openItem: null,        // which card is expanded or asking for confirmation
  panel: null,           // which little form is open (reject, cash, reply)
  sessions: [
    { device: 'This device — Chrome', when: 'Now' },
    { device: 'Phone — Safari', when: 'Nov 6, 7:42 PM' },
    { device: 'Laptop — Edge', when: 'Oct 29, 9:15 AM' }
  ]
};