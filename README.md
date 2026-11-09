# Sunrise Place – Dues Management & Homeowners Portal

**Development of a Web-Based Homeowner Portal with Dues Management for Sunrise Place Subdivision**

A high-fidelity interactive prototype for homeowners, HOA staff and the Board admin.
Plain HTML, CSS and JavaScript. No build step and no server.

> **Prototype only.** All names, emails, payments and activation codes are made-up sample data.
> Everything is saved in your own browser (localStorage). Nothing is sent anywhere.
> No real money is processed, and no real emails are sent.

## How to run
1. Keep all files in the same folder.
2. Open `index.html` in a browser (or use the Live Server extension in VS Code).
3. To start over with the original sample data, press **Reset demo data** on the login page.

## Demo logins
| Role | Email | Password |
|---|---|---|
| Homeowner | santos@example.com | Sunrise2026 |
| Staff | staff@example.com | Staff2026 |
| Admin | admin@example.com | Admin2026 |

Other sample homeowners (password `Sunrise2026`): jose.cruz@example.com, carlo.mendoza@example.com, elena.garcia@example.com

**Try registration:** Register with Grace Villanueva, Block 9, Lot 2, Phase 3, activation code `SP-4821`.
(Also: Daniel Ramos, Block 2, Lot 14, Phase 1, code `SP-7733`; Lorna Castillo, Block 5, Lot 3, Phase 2, code `SP-5190`.)

## What each role can do

**Homeowner**
- See the outstanding balance and a month-by-month breakdown
- Submit an online payment (GCash, Maya, bank) with a review step; it stays pending until staff verify it
- Book an office visit, and see payment history, statement of account and announcements
- Get in-app notifications that link to the right screen
- Request a correction

**Staff**
- Dashboard with counts and recent office activity
- Verify or reject online payments (a reason is required for rejection); duplicate reference numbers are flagged
- Record cash payments with an official receipt number; one payment can cover several months
- See upcoming visits and mark them completed or no-show
- Search homeowners, see unpaid dues, and give an activation code to homeowners without an account
- Edit a homeowner's phone number
- Reply to correction requests

**Admin** (everything staff can do, plus)
- Edit a homeowner's name, block, lot, phase or email. A supporting document and a reason are required, and a block, lot and phase already assigned to someone else is refused.
- Approve money-related corrections
- Post, edit and archive announcements
- Create and deactivate staff accounts (accounts are never deleted)
- View the audit trail of every office action

## Main flow to try
1. As the homeowner: Pay tab → choose November 2026 → enter details → Review → Submit. The balance does not change yet.
2. Log out, log in as staff: Payments → Verify (or Reject with a reason).
3. Log back in as the homeowner. The balance and history are updated, and there is a notification.
4. Log in as admin: More → Audit trail shows each action.

## Known limits (prototype)
- Data lives in one browser, not in a shared database, so different devices see different data.
- Emails and "forgot password" links are simulated on screen only.
- The system records and checks payments. It cannot prove cash or e-wallet money really arrived. Staff verify against the HOA's own records, and cash is tied to an official receipt number and the audit trail.
- The "Prototype demo" box and the Reset button on the login page are for demonstration only and would be removed in a real system.

## Files
- `index.html`: page shell
- `style.css`: all styles
- `data.js`: sample data and saved state
- `helpers.js`: small shared helpers (icons, forms, dates)
- `screens-public.js`, `screens-homeowner.js`, `screens-staff.js`: the screens
- `actions.js`, `actions-staff.js`: what the buttons do
- `main.js`: starts the app and draws the current screen
- `logo.png`: Sunrise Place logo