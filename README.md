# Khadamat OS — staff app (iPhone + Android, one codebase)

Expo SDK 58 / React Native. Talks to the live Khadamat OS API at https://khadamatos.com/api using the site's own session cookie.

## Redesign, phase 1 (24 Nov 2026) — fully native
Look: the approved design canvas "Khadamat OS staff app — redesign" — Apple's interface principles with golden-ratio sizes
(type 13 · 17 · 21 · 34 · 55, spacing 5 · 8 · 13 · 21 · 34 · 55, Today card = golden rectangle, wide screens split 38 : 62).
Tokens live in `src/theme.ts`, building blocks in `src/ui.tsx`, icons in `src/icons.tsx`.

**No website pages inside the app** (Ameen, 24 Nov 2026). `react-native-webview` is removed. A job shows in the app only once
it has its own screen (`src/jobs.ts`); the rest follow in this order: Camp Ops office side + Executive mode → payment request
from a photo, petty cash, Documents → handover, RFID, waste visits, materials, arrivals, tasks.

- **Sign in once, then unlock with the phone.** After the password (and authenticator code), the server gives this phone a key
  (`/api/app/device/register`, kept in the Keychain / Keystore by `expo-secure-store`). Opening the app asks Face ID,
  fingerprint or the phone's passcode (`expo-local-authentication`) and swaps the key for a session (`/api/app/device/resume`).
  Asks again after 5 minutes in the background (changeable in Me). Sign out forgets the key on the server too. `src/device.ts`.
- **Today:** attendance card, "Waiting for you", your jobs. Sijil records to renew sit quietly at the bottom — never as alerts.
- **Approvals, signed in the app:**
  - LPO: the PDF opens natively (`react-native-pdf`); Sign / Send back / Reject appear once it has opened. The saved signature is
    stamped into the signer's box in the app (`src/sign/stamp.ts`, ported line for line from the website so it looks the same),
    uploaded, then `/api/lpo/sign`. Supporting documents open too.
  - Payment requests: amount first, lines, documents, signing order; Sign / Send back / Reject / Ask for more documents
    (`/api/payreq/sign/*`).
  - Tasks › Signatures: tap the page where the signature goes, optional date line, then sign and return.
  - No Face ID to sign (Ameen): Sign → confirm sheet with the signature, the box and who is next → Sign.
- **Alerts:** grouped Today / Yesterday; an LPO or payment-request alert opens it in the app. Sijil alerts are filtered out.
- **Me:** unlock switch, ask-again time, notification status, items saved offline, sign out.
- **Attendance** (native, offline queue) and **Camp staff round** (mobile + PIN, QR, checkpoint visit) as before; camp
  complaints / staff / notes tiles show counts only until their native screens are built.
- **Shapes:** phone and iPhone Duo closed → bottom tab bar (frosted); iPhone Duo open, Galaxy Z Fold open, tablets → sidebar
  38.2% + screen (`src/layout.ts`).
- **Push:** iPhone registers platform `ios` (server sends through Apple once `apns.json` + the `.p8` key from the company Apple
  Developer account are on the server); Android registers `androidapp` (Firebase, visible notification).

Server side: vtameen/khadamat-os PR "Staff app: stay signed in on a phone, iPhone push, no Sijil alerts".

Checked: `npx tsc --noEmit`; `npx tsx tests/stamp.test.ts`; bundles for Android, iPhone and web; web build screenshots against
sample data, including a full LPO sign (stamp → upload → sign call). **Not yet run on a real phone** — Face ID, the native
PDF view, haptics and the frosted bars only work in a development build.

## Not done yet
- No store build yet (needs the company Apple / Google developer accounts).
- `metro.config.js` points `tslib` at its ES build so `pdf-lib` bundles.
- Navigation is a small hand-written shell, not Expo Router (the template's AGENTS.md prefers Expo Router).

## Run
```
npm install
npx expo start        # then open on a phone with a development build
npx tsc --noEmit      # type-check
```
Identifiers: Android `com.khadamat.os`, iPhone `ae.khadamatco.os` (change in app.json before the first store upload if needed).
