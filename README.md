# Khadamat OS — staff app (iPhone + Android, one codebase)

Expo SDK 58 / React Native. Talks to the live Khadamat OS API at https://khadamatos.com/api using the site's own session cookie.

## What is in this first build (24 Nov 2026)
- Sign-in with the Khadamat OS account, including the authenticator code step. "Camp staff sign-in (PIN)" opens the camp field page.
- Home built from the person's permissions: one job opens straight into that job; several jobs get Today, Approvals, Alerts, Me.
- Today and Approvals read the site's "what needs you" feed (`/api/v2/work`) and `/api/home-summary`.
- Attendance marking is native: site pills, to-mark / marked lists, Present / Absent / Leave / Sick / Half / Off, overtime. Marks made with no signal are kept on the phone (`src/outbox.ts`) and sent when the connection returns.
- Approvals list only opens a document; signing or sending back happens on the document screen.
- Every other job (Camp Ops, handover, RFID, waste visits, materials, payment request, petty cash, documents, arrivals, tasks, dashboards) opens its existing Khadamat OS page inside the app on the same sign-in (`src/screens/WebJob.tsx`).
- Phone, cover-screen and unfolded layouts: bottom bar under 600 wide, side rail and two panes at 600 and above (`src/layout.ts`).

## Camp Ops, native (added 24 Nov 2026, second pass)
- Camp staff sign-in with mobile number + PIN (`/api/campops/f/login`). The phone is identified by a key made once in the app.
- Round screen: today's checkpoints with done / due now / missed / later, plus complaint and attendance counts (`/api/campops/f/today`).
- Scan a checkpoint QR (or type its code), answer each checklist item OK or Problem; a problem needs a note and a photo; the visit is sent with the phone's GPS position (`/api/campops/f/visit`).
- Complaints, camp attendance, worker notes, registers and shifts still open the camp page inside the app.
- Accounts already linked to a phone through the web page will be refused by the app ("linked to another phone") until the office resets the phone for that account.

## Not done yet
- No store build yet. That needs Xcode / Android Studio or Expo's build service, plus the signing keys.
- Push: the code registers the device with `/api/push/register`, but Android needs `google-services.json` in the build and iPhone push needs Apple push set up on the server (the server only speaks Firebase today).
- Never run on a real phone. Checked by type-check, bundling for Android / iPhone / web, and screenshots of the web build against sample data.
- The look follows the first mockups; three other looks are on the design canvas. Colours live in `src/theme.ts`.
- Navigation is a small hand-written shell, not Expo Router (the template's AGENTS.md prefers Expo Router).

## Run
```
npm install
npx expo start        # then open on a phone with a development build
npx tsc --noEmit      # type-check
```
Identifiers: Android `com.khadamat.os`, iPhone `ae.khadamatco.os` (change in app.json before the first store upload if needed).
