// =====================================================
//  main.js  -  starts the app and draws the screens
//  This file must be loaded LAST.
// =====================================================


// A list of every screen: its name -> the function that builds it.
// To add a new screen later, add one line here.
var screens = {
  welcome: screenWelcome,
  login: screenLogin,
  forgot: screenForgot,
  forgotdone: screenForgotDone,
  register: screenRegister,
  regdone: screenRegDone,

  home: screenHome,
  pay: screenPay,
  payflow: screenPayFlow,
  review: screenReview,
  paydone: screenPayDone,
  history: screenHistory,
  statement: screenStatement,
  appts: screenAppts,
  book: screenBook,
  bookreview: screenBookReview,
  bookdone: screenBookDone,
  correction: screenCorrection,
  announce: screenAnnounce,
  notifs: screenNotifs,
  contact: screenContact,
  faq: screenFaq,
  profile: screenProfile,
  myrequests: screenMyRequests,
  terms: screenTerms,
  privacy: screenPrivacy,

  staffHome: screenStaffHome,
  staffPay: screenStaffPay,
  staffVisits: screenStaffVisits,
  staffPeople: screenStaffPeople,
  staffMore: screenStaffMore,
  staffCorrections: screenStaffCorrections,
  adminNews: screenAdminNews,
  adminAccounts: screenAdminAccounts,
  adminAudit: screenAdminAudit
};

// Screens shown before logging in (they use a narrower layout)
var publicScreens = ['welcome', 'login', 'forgot', 'forgotdone', 'register', 'regdone', 'terms', 'privacy'];


// render() draws the current screen. We call it after every change.
function render() {
  saveData();                                   // keep everything saved
  
  // a little form (reject, cash, reply) closes when we move to another screen
  if (state.lastScreen !== state.screen) { state.panel = null; }

  var app = document.getElementById('app');

  // 1. Ask the right function for this screen's HTML
  var build = screens[state.screen];
  if (!build) { build = screenWelcome; }
  var html = build();

  // 2. Pick the layout classes
  var cssClass = 'phone';
  if (state.screen === 'home') { cssClass += ' wide'; }
  if (state.role === 'staff' || state.role === 'admin') { cssClass += ' wide'; }
  if (publicScreens.indexOf(state.screen) >= 0) { cssClass += ' auth'; }
  if (html.indexOf('class="tabs"') >= 0) { cssClass += ' withnav'; }
  app.className = cssClass;

  // 3. Remember the scroll position if we are redrawing the same screen
  var oldBody = app.querySelector('.body');
  var scrollPosition = 0;
  if (oldBody && state.lastScreen === state.screen) { scrollPosition = oldBody.scrollTop; }

  // 4. Add the little pop-up message if there is one
  if (state.toastText) {
    html += '<div class="toast" role="status">' + safe(state.toastText) + '</div>';
  }

  // 5. Put the HTML on the page
  app.innerHTML = html;

  var newBody = app.querySelector('.body');
  if (newBody) { newBody.scrollTop = scrollPosition; }
  state.lastScreen = state.screen;
}


// Draw the first screen
render();